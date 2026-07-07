import { SceneManager } from './scene.js';
import { Player } from './player.js';
import { InvaderFleet } from './invaders.js';
import { Projectiles } from './projectiles.js';
import { Effects } from './effects.js';
import { AudioFX } from './audio.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import {
  PLAYER_MAX_BULLETS,
  INVADER_FIRE_RATE,
  INVASION_Z,
  START_LIVES,
  WAVE_CLEAR_DELAY,
} from './constants.js';

const HISCORE_KEY = 'si3d-hiscore';

// 状態機械(title / playing / gameover)と各モジュールの統括
export class Game {
  constructor(container) {
    this.sceneManager = new SceneManager(container);
    const { scene, camera, cameraBasePos } = this.sceneManager;
    this.player = new Player(scene);
    this.fleet = new InvaderFleet(scene);
    this.projectiles = new Projectiles(scene);
    this.effects = new Effects(scene, camera, cameraBasePos);
    this.audio = new AudioFX();
    this.hud = new Hud();
    this.input = new Input();
    this.input.onFirstInteraction = () => this.audio.init();
    this.fleet.onStep = () => this.audio.fleetStep();

    this.state = 'title';
    this.score = 0;
    this.hiscore = Number(localStorage.getItem(HISCORE_KEY)) || 0;
    this.lives = START_LIVES;
    this.wave = 1;
    this.waveClearTimer = 0;
    // ゲームオーバー直後、プレイ中の連打が誤って即リスタートさせるのを防ぐ
    this.restartLockout = 0;
    // 押しっぱなし連射のクールダウン
    this.fireCooldown = 0;

    this.hud.setHiscore(this.hiscore);
    this.hud.showTitle();
    // タイトル画面の背景としてデモ用の編隊を表示しておく
    this.fleet.spawn(1);

    this.lastTime = performance.now();
    requestAnimationFrame(() => this.loop());
  }

  loop() {
    const now = performance.now();
    // タブ非アクティブ復帰時の暴走を防ぐため dt に上限を設ける
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.input.update();
    this.update(dt);
    this.sceneManager.update(dt);
    this.effects.update(dt);
    this.sceneManager.render();

    requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    switch (this.state) {
      case 'title':
      case 'gameover':
        // 背景の編隊はデモとして動かし続け、侵略しきったら仕切り直す
        this.fleet.update(dt);
        if (this.fleet.frontZ >= INVASION_Z || this.fleet.aliveCount === 0) {
          this.fleet.spawn(1);
        }
        if (this.restartLockout > 0) {
          this.restartLockout -= dt;
          this.input.consumeStart();
        } else if (this.input.consumeStart()) {
          this.startGame();
        }
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
    }
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.lives = START_LIVES;
    this.wave = 1;
    this.waveClearTimer = 0;
    this.player.reset();
    this.projectiles.clearAll();
    this.fleet.spawn(this.wave);
    this.hud.setScore(this.score);
    this.hud.setLives(this.lives);
    this.hud.setWave(this.wave);
    this.hud.hideOverlay();
  }

  updatePlaying(dt) {
    this.player.update(dt, this.input);
    this.fleet.update(dt);
    this.projectiles.update(dt);

    // 自機の射撃。単発押しは即時、押しっぱなしはクールダウン付き連射。
    // どちらも同時弾数制限がかかる
    this.fireCooldown -= dt;
    const wantsFire =
      this.input.firePressed || (this.input.fire && this.fireCooldown <= 0);
    if (
      wantsFire &&
      this.projectiles.playerBullets.length < PLAYER_MAX_BULLETS
    ) {
      this.projectiles.firePlayerBullet(this.player.position);
      this.audio.shoot();
      this.fireCooldown = 0.32;
    }

    this.updateEnemyFire(dt);
    this.checkCollisions();

    // 編隊が自機ラインまで前進したら即ゲームオーバー(原作の侵略ルール)
    if (this.fleet.frontZ >= INVASION_Z) {
      this.gameOver();
      return;
    }

    // ウェーブクリア → 少し待って次の編隊
    if (this.fleet.aliveCount === 0) {
      if (this.waveClearTimer === 0) this.audio.waveClear();
      this.waveClearTimer += dt;
      if (this.waveClearTimer >= WAVE_CLEAR_DELAY) {
        this.waveClearTimer = 0;
        this.wave += 1;
        this.hud.setWave(this.wave);
        this.projectiles.clearEnemyBullets();
        this.fleet.spawn(this.wave);
      }
    }
  }

  updateEnemyFire(dt) {
    const shooters = this.fleet.frontLine();
    if (shooters.length === 0) return;
    // ウェーブと残数の少なさに応じて攻撃頻度を上げる
    const rate = INVADER_FIRE_RATE * (1 + (this.wave - 1) * 0.25);
    if (Math.random() < rate * dt) {
      const shooter = shooters[Math.floor(Math.random() * shooters.length)];
      this.projectiles.fireEnemyBullet(shooter.mesh.position);
    }
  }

  checkCollisions() {
    // 自機弾 vs 敵
    const alive = this.fleet.aliveInvaders;
    for (const bullet of [...this.projectiles.playerBullets]) {
      for (const inv of alive) {
        if (!inv.alive) continue;
        if (bullet.position.distanceTo(inv.mesh.position) < 1.2) {
          this.fleet.kill(inv);
          this.projectiles.remove(this.projectiles.playerBullets, bullet);
          this.effects.spawnExplosion(inv.mesh.position, 0xffaa55);
          this.audio.invaderKilled();
          this.addScore(inv.score);
          break;
        }
      }
    }

    // 敵弾 vs 自機
    if (!this.player.isInvincible) {
      for (const bullet of [...this.projectiles.enemyBullets]) {
        if (bullet.position.distanceTo(this.player.position) < 1.1) {
          this.projectiles.remove(this.projectiles.enemyBullets, bullet);
          this.onPlayerHit();
          break;
        }
      }
    }
  }

  addScore(points) {
    this.score += points;
    this.hud.setScore(this.score);
    if (this.score > this.hiscore) {
      this.hiscore = this.score;
      this.hud.setHiscore(this.hiscore);
    }
  }

  onPlayerHit() {
    this.lives -= 1;
    this.hud.setLives(this.lives);
    this.effects.spawnExplosion(this.player.position, 0x6fd6ff, 60);
    this.effects.shake(0.8, 0.5);
    this.audio.playerHit();
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.player.startInvincible();
      this.projectiles.clearEnemyBullets();
    }
  }

  gameOver() {
    this.state = 'gameover';
    this.restartLockout = 1.0;
    this.audio.gameOver();
    const isNewRecord =
      this.score > 0 &&
      this.score >= this.hiscore &&
      this.score > (Number(localStorage.getItem(HISCORE_KEY)) || 0);
    localStorage.setItem(HISCORE_KEY, String(this.hiscore));
    this.hud.showGameOver(this.score, isNewRecord);
  }
}
