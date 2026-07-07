import * as THREE from 'three';
import {
  FIELD_HALF_WIDTH,
  PLAYER_Z,
  PLAYER_SPEED,
  PLAYER_INVINCIBLE_TIME,
} from './constants.js';

// 自機。プリミティブの組み合わせで宇宙船を作り、左右移動と無敵時間を管理する
export class Player {
  constructor(scene) {
    this.mesh = this.buildShip();
    this.mesh.position.set(0, 0, PLAYER_Z);
    scene.add(this.mesh);
    this.invincibleTimer = 0;
  }

  buildShip() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x3fa9ff,
      emissive: 0x0a2a55,
      metalness: 0.5,
      roughness: 0.35,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x7dffb0,
      emissive: 0x1a5533,
      metalness: 0.3,
      roughness: 0.4,
    });

    // 機首(前方 = -Z を向く)
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 4), bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.z = Math.PI / 4;
    nose.position.z = -0.7;
    group.add(nose);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.4), bodyMat);
    body.position.z = 0.4;
    group.add(body);

    const wingGeo = new THREE.BoxGeometry(1.1, 0.15, 0.9);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, accentMat);
      wing.position.set(side * 0.95, -0.1, 0.6);
      wing.rotation.z = side * 0.25;
      group.add(wing);
    }

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xccf5ff,
        emissive: 0x88ccff,
        emissiveIntensity: 0.6,
        roughness: 0.1,
      }),
    );
    cockpit.position.set(0, 0.35, 0.3);
    group.add(cockpit);

    const engineGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 0.35, 8),
      new THREE.MeshBasicMaterial({ color: 0xff9d5c }),
    );
    engineGlow.rotation.x = Math.PI / 2;
    engineGlow.position.set(0, 0, 1.25);
    group.add(engineGlow);

    return group;
  }

  get position() {
    return this.mesh.position;
  }

  get isInvincible() {
    return this.invincibleTimer > 0;
  }

  reset() {
    this.mesh.position.set(0, 0, PLAYER_Z);
    this.mesh.visible = true;
    this.invincibleTimer = 0;
  }

  startInvincible() {
    this.invincibleTimer = PLAYER_INVINCIBLE_TIME;
  }

  update(dt, input) {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    this.mesh.position.x = THREE.MathUtils.clamp(
      this.mesh.position.x + dir * PLAYER_SPEED * dt,
      -FIELD_HALF_WIDTH,
      FIELD_HALF_WIDTH,
    );
    // 移動方向にバンクさせて飛行機らしさを出す
    const targetRoll = -dir * 0.45;
    this.mesh.rotation.z += (targetRoll - this.mesh.rotation.z) * Math.min(1, dt * 10);

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      // 無敵中は点滅させる
      this.mesh.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
      if (this.invincibleTimer <= 0) this.mesh.visible = true;
    }
  }
}
