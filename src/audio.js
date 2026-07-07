// Web Audio API のオシレーター/ノイズだけで合成する効果音。外部ファイル不使用。
const MASTER_VOLUME = 0.35;
const MUTE_KEY = 'si3d-muted';

export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.stepIndex = 0;
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
  }

  // ブラウザの自動再生制限があるため、最初のユーザー操作後に呼ぶ
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(this.ctx.destination);
  }

  // BGM/効果音を一括でミュート切替し、設定を保存する。現在の状態を返す
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    if (this.master) {
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    }
    return this.muted;
  }

  tone({ freq, endFreq, type = 'square', duration = 0.1, volume = 0.5, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  noise({ duration = 0.3, volume = 0.6, filterFreq = 1000 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t0);
    filter.frequency.exponentialRampToValueAtTime(100, t0 + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  shoot() {
    this.tone({ freq: 900, endFreq: 220, type: 'square', duration: 0.12, volume: 0.3 });
  }

  invaderKilled() {
    this.noise({ duration: 0.25, volume: 0.5, filterFreq: 2200 });
    this.tone({ freq: 320, endFreq: 60, type: 'sawtooth', duration: 0.2, volume: 0.3 });
  }

  playerHit() {
    this.noise({ duration: 0.6, volume: 0.8, filterFreq: 900 });
    this.tone({ freq: 200, endFreq: 40, type: 'sawtooth', duration: 0.6, volume: 0.5 });
  }

  // 原作の「ズン、ズン」という編隊移動の 4 音ループ
  fleetStep() {
    const notes = [110, 104, 98, 92];
    // BGM のベース(A2 = 110Hz)と同じ帯域なので控えめにしてマスキングを避ける
    this.tone({
      freq: notes[this.stepIndex],
      type: 'triangle',
      duration: 0.09,
      volume: 0.3,
    });
    this.stepIndex = (this.stepIndex + 1) % notes.length;
  }

  waveClear() {
    [440, 554, 659, 880].forEach((freq, i) => {
      this.tone({ freq, type: 'square', duration: 0.12, volume: 0.3, delay: i * 0.12 });
    });
  }

  gameOver() {
    [330, 262, 196, 131].forEach((freq, i) => {
      this.tone({ freq, type: 'sawtooth', duration: 0.25, volume: 0.35, delay: i * 0.2 });
    });
  }
}
