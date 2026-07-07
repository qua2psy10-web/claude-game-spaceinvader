import * as THREE from 'three';
import { FIELD_HALF_WIDTH, PLAYER_Z, INVADER_START_Z } from './constants.js';

// レンダラー・カメラ・ライト・背景(星空/グリッド)などゲーム内容に依存しない舞台装置
export class SceneManager {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000010);
    this.scene.fog = new THREE.Fog(0x000010, 70, 160);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      400,
    );
    // 自機の背後上空からフィールドを見下ろす視点
    this.cameraBasePos = new THREE.Vector3(0, 19, PLAYER_Z + 16);
    this.cameraLookAt = new THREE.Vector3(0, 0, -3);
    this.camera.position.copy(this.cameraBasePos);
    this.camera.lookAt(this.cameraLookAt);

    this.scene.add(new THREE.AmbientLight(0x8899bb, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(8, 20, 12);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x4466ff, 0.8);
    rim.position.set(-10, 6, -14);
    this.scene.add(rim);

    this.stars = this.createStarfield();
    this.scene.add(this.stars);
    this.scene.add(this.createFloor());

    window.addEventListener('resize', () => this.onResize());
  }

  createStarfield() {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = THREE.MathUtils.randFloatSpread(220);
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(-40, 80);
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(-160, 40);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xbfd4ff,
      size: 0.35,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      fog: false,
    });
    return new THREE.Points(geometry, material);
  }

  createFloor() {
    const grid = new THREE.GridHelper(
      FIELD_HALF_WIDTH * 4,
      26,
      0x1d3f66,
      0x122740,
    );
    grid.position.set(0, -1.6, (PLAYER_Z + INVADER_START_Z) / 2);
    return grid;
  }

  update(dt) {
    // 星をゆっくり手前に流して飛行感を出す(範囲を出たら奥へ戻す)
    const positions = this.stars.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      let z = positions.getZ(i) + dt * 6;
      if (z > 40) z -= 200;
      positions.setZ(i, z);
    }
    positions.needsUpdate = true;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
