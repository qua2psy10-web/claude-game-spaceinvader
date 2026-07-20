// HTML オーバーレイ(スコア・残機・タイトル/ゲームオーバー画面)の表示更新
export class Hud {
  constructor() {
    this.scoreEl = document.getElementById('score');
    this.hiscoreEl = document.getElementById('hiscore');
    this.waveEl = document.getElementById('wave');
    this.livesEl = document.getElementById('lives');
    this.overlayEl = document.getElementById('overlay');
    this.titleEl = document.getElementById('overlay-title');
    this.msgEl = document.getElementById('overlay-msg');
    this.subEl = document.getElementById('overlay-sub');
    this.muteEl = document.getElementById('btn-mute');
    this.diffBtns = Array.from(document.querySelectorAll('.diff-btn'));
  }

  setMuted(muted) {
    this.muteEl.textContent = muted ? '🔇' : '🔊';
    this.muteEl.classList.toggle('muted', muted);
  }

  setDifficulty(name) {
    for (const btn of this.diffBtns) {
      btn.classList.toggle('selected', btn.dataset.diff === name);
    }
  }

  setScore(score) {
    this.scoreEl.textContent = String(score);
  }

  setHiscore(score) {
    this.hiscoreEl.textContent = String(score);
  }

  setWave(wave) {
    this.waveEl.textContent = String(wave);
  }

  setLives(lives) {
    this.livesEl.textContent = lives > 0 ? Array(lives).fill('▲').join(' ') : '-';
  }

  showTitle() {
    this.titleEl.textContent = '3D SPACE INVADERS';
    this.msgEl.textContent = '';
    this.subEl.textContent = 'PRESS SPACE OR TAP TO START';
    this.overlayEl.classList.remove('hidden');
  }

  showGameOver(score, isNewRecord) {
    this.titleEl.textContent = 'GAME OVER';
    this.msgEl.textContent = isNewRecord
      ? `NEW RECORD! ${score}`
      : `SCORE ${score}`;
    this.subEl.textContent = 'PRESS SPACE OR TAP TO RESTART';
    this.overlayEl.classList.remove('hidden');
  }

  hideOverlay() {
    this.overlayEl.classList.add('hidden');
  }
}
