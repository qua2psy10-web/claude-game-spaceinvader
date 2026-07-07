// キーボードとタッチ(バーチャルボタン)を同じインターフェースに統合する
export class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.fire = false;
    // 押した瞬間だけ true になるエッジ検出。
    // フレームをまたがない高速な down→up も取りこぼさないよう、
    // イベント時点でキューに積み update() で 1 フレームだけ true にする
    this.firePressed = false;
    this._firePressQueued = false;
    this.onFirstInteraction = null;
    this._interacted = false;
    // タイトル/ゲームオーバー画面での「開始操作」(スペース or 画面タップ)
    this._startQueued = false;

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));

    if (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) {
      document.body.classList.add('touch');
    }
    this.bindButton('btn-left', (down) => (this.left = down));
    this.bindButton('btn-right', (down) => (this.right = down));
    this.bindButton('btn-fire', (down) => {
      this.fire = down;
      if (down) this._firePressQueued = true;
    });

    // タッチ端末では画面のどこをタップしても開始できるようにする
    window.addEventListener(
      'pointerdown',
      () => {
        this._startQueued = true;
        this.markInteraction();
      },
      { passive: true },
    );
  }

  onKey(e, down) {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.left = down;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.right = down;
        break;
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
      case 'Enter':
        this.fire = down;
        if (down && !e.repeat) {
          this._firePressQueued = true;
          this._startQueued = true;
        }
        e.preventDefault();
        break;
      default:
        return;
    }
    if (down) this.markInteraction();
  }

  bindButton(id, setter) {
    const el = document.getElementById(id);
    if (!el) return;
    const press = (e) => {
      e.preventDefault();
      el.classList.add('pressed');
      setter(true);
      this.markInteraction();
    };
    const release = (e) => {
      e.preventDefault();
      el.classList.remove('pressed');
      setter(false);
    };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  markInteraction() {
    if (this._interacted) return;
    this._interacted = true;
    if (this.onFirstInteraction) this.onFirstInteraction();
  }

  // 毎フレーム冒頭で呼び、キューされた発射エッジを 1 フレームだけ反映する
  update() {
    this.firePressed = this._firePressQueued;
    this._firePressQueued = false;
  }

  // 開始操作が来ていれば true を返し、フラグを消費する
  consumeStart() {
    const queued = this._startQueued;
    this._startQueued = false;
    return queued;
  }
}
