import * as THREE from 'three';

// 爆発パーティクルとカメラシェイク
export class Effects {
  constructor(scene, camera, cameraBasePos) {
    this.scene = scene;
    this.camera = camera;
    this.cameraBasePos = cameraBasePos;
    this.explosions = [];
    this.shakeTime = 0;
    this.shakeStrength = 0;
  }

  spawnExplosion(position, color = 0xffaa55, count = 40) {
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      )
        .normalize()
        .multiplyScalar(THREE.MathUtils.randFloat(4, 12));
      velocities.push(dir);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color,
      size: 0.35,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    this.explosions.push({ points, velocities, life: 0.8, maxLife: 0.8 });
  }

  shake(strength = 0.5, duration = 0.35) {
    this.shakeStrength = strength;
    this.shakeTime = duration;
  }

  update(dt) {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.life -= dt;
      if (ex.life <= 0) {
        this.scene.remove(ex.points);
        ex.points.geometry.dispose();
        ex.points.material.dispose();
        this.explosions.splice(i, 1);
        continue;
      }
      const positions = ex.points.geometry.attributes.position;
      for (let j = 0; j < ex.velocities.length; j++) {
        const v = ex.velocities[j];
        positions.setXYZ(
          j,
          positions.getX(j) + v.x * dt,
          positions.getY(j) + v.y * dt,
          positions.getZ(j) + v.z * dt,
        );
        // 減速させて爆発の勢いを表現
        v.multiplyScalar(1 - dt * 2.2);
      }
      positions.needsUpdate = true;
      ex.points.material.opacity = ex.life / ex.maxLife;
    }

    // カメラシェイク(基準位置からのオフセットとして適用)
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const s = this.shakeStrength * Math.max(0, this.shakeTime / 0.35);
      this.camera.position.set(
        this.cameraBasePos.x + (Math.random() - 0.5) * s,
        this.cameraBasePos.y + (Math.random() - 0.5) * s,
        this.cameraBasePos.z + (Math.random() - 0.5) * s,
      );
    } else {
      this.camera.position.copy(this.cameraBasePos);
    }
  }
}
