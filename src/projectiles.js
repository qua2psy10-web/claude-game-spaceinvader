import * as THREE from 'three';
import {
  PLAYER_BULLET_SPEED,
  INVADER_BULLET_SPEED,
  PLAYER_Z,
  INVADER_START_Z,
} from './constants.js';

// 自機弾と敵弾の生成・移動・破棄。衝突判定そのものは game.js が行う
export class Projectiles {
  constructor(scene) {
    this.scene = scene;
    this.playerBullets = [];
    this.enemyBullets = [];

    this.playerBulletGeo = new THREE.CapsuleGeometry(0.12, 0.8, 4, 8);
    this.playerBulletMat = new THREE.MeshBasicMaterial({ color: 0x7dffb0 });
    this.enemyBulletGeo = new THREE.CapsuleGeometry(0.15, 0.6, 4, 8);
    this.enemyBulletMat = new THREE.MeshBasicMaterial({ color: 0xff6f9c });
  }

  firePlayerBullet(position) {
    const mesh = new THREE.Mesh(this.playerBulletGeo, this.playerBulletMat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.z -= 1.2;
    this.scene.add(mesh);
    this.playerBullets.push(mesh);
  }

  fireEnemyBullet(position) {
    const mesh = new THREE.Mesh(this.enemyBulletGeo, this.enemyBulletMat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.z += 1.0;
    this.scene.add(mesh);
    this.enemyBullets.push(mesh);
  }

  remove(list, mesh) {
    this.scene.remove(mesh);
    const i = list.indexOf(mesh);
    if (i !== -1) list.splice(i, 1);
  }

  clearAll() {
    for (const b of [...this.playerBullets]) this.remove(this.playerBullets, b);
    for (const b of [...this.enemyBullets]) this.remove(this.enemyBullets, b);
  }

  clearEnemyBullets() {
    for (const b of [...this.enemyBullets]) this.remove(this.enemyBullets, b);
  }

  update(dt) {
    // 逆順ループで削除しながら回す
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      b.position.z -= PLAYER_BULLET_SPEED * dt;
      if (b.position.z < INVADER_START_Z - 6) this.remove(this.playerBullets, b);
    }
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.position.z += INVADER_BULLET_SPEED * dt;
      if (b.position.z > PLAYER_Z + 4) this.remove(this.enemyBullets, b);
    }
  }
}
