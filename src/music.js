// ホルスト「惑星」の火星風のおどろおどろしい BGM。5/4 拍子の執拗な
// オスティナートと、半音・三全音でぶつかる金管風の旋律をオシレーターで
// 合成する(外部ファイル不使用)。
// AudioFX の ctx / master を共有するので、ミュートは master 側で一括制御される。

const BASE_BPM = 144;
// 何秒先までノートを予約しておくか。rAF が 1 フレーム落ちても途切れない程度
const LOOKAHEAD = 0.18;
// 1 拍 = 6 ティックにすると 3 連符(2 ティック)と 8 分音符(3 ティック)を両方置ける
const TICKS_PER_BEAT = 6;
const BAR = 5 * TICKS_PER_BEAT; // 5/4 拍子 = 30 ティック
const LOOP = BAR * 4; // 4 小節ループ

// 「火星」の代名詞の 5/4 リズム: 3連符・4分・4分・8分+8分・4分
const OSTINATO_RHYTHM = [0, 2, 4, 6, 12, 18, 21, 24];

// 旋律 [開始ティック, MIDI ノート, 長さ(ティック)]。
// 1 小節目はオスティナートのみで不穏さを溜め、以降 E → F → E → Eb → D →
// C → B → Bb と半音階でずり下がり、A の連打に対して常に不協和をぶつける
const MELODY = [
  // 2 小節目: 5 度(E)から半音上の F で軋ませて戻る
  [BAR + 0, 64, 12],
  [BAR + 12, 65, 6],
  [BAR + 18, 64, 12],
  // 3 小節目: A に対する三全音 Eb から半音階下降
  [BAR * 2 + 0, 63, 12],
  [BAR * 2 + 12, 62, 6],
  [BAR * 2 + 18, 60, 12],
  // 4 小節目: B → Bb とずり下がり、ループ頭の A 連打へ雪崩れ込む
  [BAR * 3 + 0, 59, 12],
  [BAR * 3 + 12, 58, 18],
];

function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Music {
  constructor(fx) {
    this.fx = fx;
    this.playing = false;
    this.tempoScale = 1;
    this.tick = 0;
    this.nextTime = 0;
    this.gain = null;
    this.noiseBuffer = null;

    // ティック → イベントの索引を作っておく
    this.ostinatoTicks = new Set();
    for (let bar = 0; bar < 4; bar++) {
      for (const t of OSTINATO_RHYTHM) this.ostinatoTicks.add(bar * BAR + t);
    }
    this.melodyByTick = new Map();
    for (const [t, midi, dur] of MELODY) this.melodyByTick.set(t, { midi, dur });
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
    this.tick = 0;
    this.nextTime = this.fx.ctx ? this.fx.ctx.currentTime + 0.05 : 0;
  }

  stop() {
    this.playing = false;
  }

  // 0(平常)〜1(ピンチ)。テンポを最大 1.4 倍(約 200 BPM)までスケールする
  setIntensity(value) {
    this.tempoScale = 1 + Math.min(Math.max(value, 0), 1) * 0.4;
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
      const tickDur = 60 / (BASE_BPM * this.tempoScale) / TICKS_PER_BEAT;
      this.scheduleTick(this.tick, this.nextTime, tickDur);
      this.nextTime += tickDur;
      this.tick = (this.tick + 1) % LOOP;
    }
  }

  scheduleTick(tick, t, tickDur) {
    if (this.ostinatoTicks.has(tick)) {
      const accent = tick % BAR === 0;
      // col legno 風の乾いた打撃: 低い三角波 + 矩形波 + ノイズを重ねる
      this.pluck(45, t, tickDur * 1.6, 'triangle', accent ? 0.65 : 0.5);
      this.pluck(57, t, tickDur * 1.4, 'square', accent ? 0.2 : 0.14);
      this.hat(t, accent ? 0.18 : 0.1);
    }

    const ev = this.melodyByTick.get(tick);
    if (ev) {
      const dur = ev.dur * tickDur;
      // 金管風のサワートゥースをオクターブで重ねて威圧感を出す
      this.brass(ev.midi, t, dur, 0.26);
      this.brass(ev.midi - 12, t, dur, 0.2);
    }
  }

  // 短い減衰音(オスティナートの打撃用)
  pluck(midi, t, dur, type, vol) {
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

  // 立ち上がり + 持続 + 減衰のエンベロープで金管らしく鳴らす(旋律用)
  brass(midi, t, dur, vol) {
    const ctx = this.fx.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = midiToFreq(midi);
    const g = ctx.createGain();
    const attackEnd = t + 0.04;
    const releaseStart = Math.max(attackEnd, t + dur - 0.15);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, attackEnd);
    g.gain.setValueAtTime(vol, releaseStart);
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
