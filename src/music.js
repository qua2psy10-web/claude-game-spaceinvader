// レトロチップチューン BGM。Web Audio のオシレーターのみで合成し、
// ルックアヘッド方式で 16 分音符単位にノートを予約する(外部ファイル不使用)。
// AudioFX の ctx / master を共有するので、ミュートは master 側で一括制御される。

const BASE_BPM = 112;
// 何秒先までノートを予約しておくか。rAF が 1 フレーム落ちても途切れない程度
const LOOKAHEAD = 0.18;
const STEPS = 32; // 16 分音符 × 32 = 2 小節ループ

// A マイナーの下降進行 Am → G → F → E(原作の 4 音マーチと同じ雰囲気)
// 値は MIDI ノート番号、null は休符
const BASS = [
  45, null, 45, null, 45, null, 45, null, // A2
  43, null, 43, null, 43, null, 43, null, // G2
  41, null, 41, null, 41, null, 41, null, // F2
  40, null, 40, null, 40, null, 43, null, // E2 (最後に G2 で折り返し)
];

const LEAD = [
  69, null, 72, null, 76, null, 72, null, // Am アルペジオ
  74, null, 71, null, 67, null, 71, null, // G
  72, null, 69, null, 65, null, 69, null, // F
  71, null, 68, null, 64, null, 68, 71,   // E7(G# で緊張感を出してループ頭へ)
];

function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Music {
  constructor(fx) {
    this.fx = fx;
    this.playing = false;
    this.tempoScale = 1;
    this.step = 0;
    this.nextTime = 0;
    this.gain = null;
    this.noiseBuffer = null;
  }

  // ctx は初回ユーザー操作後にしか存在しないため、必要になった時点で組み立てる
  ensureNodes() {
    const ctx = this.fx.ctx;
    if (!ctx || this.gain) return;
    this.gain = ctx.createGain();
    this.gain.gain.value = 1.0;
    this.gain.connect(this.fx.master);

    const length = Math.floor(ctx.sampleRate * 0.05);
    this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  start() {
    this.playing = true;
    this.step = 0;
    this.nextTime = this.fx.ctx ? this.fx.ctx.currentTime + 0.05 : 0;
  }

  stop() {
    this.playing = false;
  }

  // 0(平常)〜1(ピンチ)。テンポを最大 1.6 倍までスケールする
  setIntensity(value) {
    this.tempoScale = 1 + Math.min(Math.max(value, 0), 1) * 0.6;
  }

  update() {
    if (!this.playing) return;
    const ctx = this.fx.ctx;
    if (!ctx) return;
    this.ensureNodes();

    // タブ復帰などで時間が飛んでいたら追いかけず現在時刻から再開する
    if (this.nextTime < ctx.currentTime - 0.2) {
      this.nextTime = ctx.currentTime + 0.05;
    }

    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      const stepDur = 60 / (BASE_BPM * this.tempoScale) / 4;
      this.scheduleStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % STEPS;
    }
  }

  scheduleStep(step, t, stepDur) {
    const bass = BASS[step];
    if (bass !== null) {
      this.note(bass, t, stepDur * 1.8, 'triangle', 0.6);
    }
    const lead = LEAD[step];
    if (lead !== null) {
      this.note(lead, t, stepDur * 1.5, 'square', 0.28);
    }
    // ハイハット: 8 分刻み、4 分の頭にアクセント
    if (step % 2 === 0) {
      this.hat(t, step % 4 === 0 ? 0.16 : 0.08);
    }
  }

  note(midi, t, dur, type, vol) {
    const ctx = this.fx.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = midiToFreq(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.gain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  hat(t, vol) {
    const ctx = this.fx.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(filter).connect(g).connect(this.gain);
    src.start(t);
  }
}
