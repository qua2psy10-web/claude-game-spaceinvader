import * as THREE from 'three';
import {
  FIELD_HALF_WIDTH,
  INVADER_ROWS,
  INVADER_COLS,
  INVADER_SPACING_X,
  INVADER_SPACING_Z,
  INVADER_START_Z,
  INVADER_STEP_X,
  INVADER_ADVANCE_Z,
  INVADER_STEP_INTERVAL_MAX,
  INVADER_STEP_INTERVAL_MIN,
  INVADER_TYPES,
} from './constants.js';

// 敵編隊。原作同様に一定間隔の「ステップ」で一体となって動き、
// 端に達すると前進して反転する。残数が減るほどステップ間隔が縮む。
export class InvaderFleet {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.invaders = [];
    this.direction = 1;
    this.stepTimer = 0;
    this.speedScale = 1;
    this.onStep = null; // 移動音用コールバック
  }

  spawn(wave) {
    this.clear();
    this.direction = 1;
    this.stepTimer = 0;
    // ウェーブが進むごとに全体を速く、開始位置を少し手前にする
    this.speedScale = 1 + (wave - 1) * 0.15;
    const startZ = INVADER_START_Z + Math.min(wave - 1, 4) * 0.8;

    const offsetX = ((INVADER_COLS - 1) * INVADER_SPACING_X) / 2;
    for (let row = 0; row < INVADER_ROWS; row++) {
      const type = INVADER_TYPES[row];
      for (let col = 0; col < INVADER_COLS; col++) {
        const mesh = this.buildInvader(row, type.color);
        mesh.position.set(
          col * INVADER_SPACING_X - offsetX,
          0,
          startZ + row * INVADER_SPACING_Z,
        );
        this.group.add(mesh);
        this.invaders.push({ mesh, score: type.score, alive: true });
      }
    }
  }

  buildInvader(row, color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.25,
      metalness: 0.2,
      roughness: 0.5,
    });

    if (row === 0) {
      // squid: 八面体 + 触手
      const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), mat);
      group.add(head);
      const legGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
      for (const x of [-0.35, 0, 0.35]) {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(x, -0.7, 0);
        group.add(leg);
      }
    } else if (row <= 2) {
      // crab: 胴体 + 左右のツノ
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), mat);
      group.add(body);
      const clawGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
      for (const x of [-0.7, 0.7]) {
        const claw = new THREE.Mesh(clawGeo, mat);
        claw.position.set(x, 0.4, 0);
        claw.rotation.z = -x * 0.5;
        group.add(claw);
      }
    } else {
      // octopus: ドーム + 足 2 本
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        mat,
      );
      group.add(dome);
      const footGeo = new THREE.BoxGeometry(0.3, 0.4, 0.3);
      for (const x of [-0.4, 0.4]) {
        const foot = new THREE.Mesh(footGeo, mat);
        foot.position.set(x, -0.25, 0);
        group.add(foot);
      }
    }

    // 目(全タイプ共通)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeGeo = new THREE.SphereGeometry(0.09, 6, 6);
    for (const x of [-0.25, 0.25]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, 0.1, 0.45);
      group.add(eye);
    }
    return group;
  }

  clear() {
    for (const inv of this.invaders) {
      this.group.remove(inv.mesh);
    }
    this.invaders = [];
  }

  get aliveInvaders() {
    return this.invaders.filter((inv) => inv.alive);
  }

  get aliveCount() {
    return this.invaders.reduce((n, inv) => n + (inv.alive ? 1 : 0), 0);
  }

  // 残数比率でステップ間隔を補間(少ないほど速い)
  get stepInterval() {
    const total = INVADER_ROWS * INVADER_COLS;
    const ratio = this.aliveCount / total;
    const interval = THREE.MathUtils.lerp(
      INVADER_STEP_INTERVAL_MIN,
      INVADER_STEP_INTERVAL_MAX,
      ratio,
    );
    return interval / this.speedScale;
  }

  // 編隊の最前線(自機に最も近い)Z 座標
  get frontZ() {
    let front = -Infinity;
    for (const inv of this.aliveInvaders) {
      front = Math.max(front, inv.mesh.position.z);
    }
    return front;
  }

  update(dt) {
    if (this.aliveCount === 0) return;
    this.stepTimer += dt;
    if (this.stepTimer < this.stepInterval) return;
    this.stepTimer = 0;

    // 次のステップで端を越えるなら、前進して反転する
    let minX = Infinity;
    let maxX = -Infinity;
    for (const inv of this.aliveInvaders) {
      minX = Math.min(minX, inv.mesh.position.x);
      maxX = Math.max(maxX, inv.mesh.position.x);
    }
    const nextMax = maxX + this.direction * INVADER_STEP_X;
    const nextMin = minX + this.direction * INVADER_STEP_X;
    const hitEdge = nextMax > FIELD_HALF_WIDTH || nextMin < -FIELD_HALF_WIDTH;

    for (const inv of this.aliveInvaders) {
      if (hitEdge) {
        inv.mesh.position.z += INVADER_ADVANCE_Z;
      } else {
        inv.mesh.position.x += this.direction * INVADER_STEP_X;
      }
      // ステップごとに小さく身震いさせて生きている感を出す
      inv.mesh.rotation.y = (Math.random() - 0.5) * 0.3;
      inv.mesh.position.y = inv.mesh.position.y === 0 ? 0.25 : 0;
    }
    if (hitEdge) this.direction *= -1;
    if (this.onStep) this.onStep();
  }

  // 各列の最前列(自機に一番近い生存個体)= 弾を撃てる個体
  frontLine() {
    const byColumn = new Map();
    for (const inv of this.aliveInvaders) {
      const key = Math.round(inv.mesh.position.x / INVADER_SPACING_X);
      const current = byColumn.get(key);
      if (!current || inv.mesh.position.z > current.mesh.position.z) {
        byColumn.set(key, inv);
      }
    }
    return [...byColumn.values()];
  }

  kill(invader) {
    invader.alive = false;
    this.group.remove(invader.mesh);
  }
}
