// フィールドと難易度のチューニング値をここに集約する
export const FIELD_HALF_WIDTH = 13;
export const PLAYER_Z = 14;
export const PLAYER_SPEED = 16;
export const PLAYER_MAX_BULLETS = 2;
export const PLAYER_BULLET_SPEED = 34;
export const PLAYER_INVINCIBLE_TIME = 2.2;

export const INVADER_ROWS = 5;
export const INVADER_COLS = 10;
export const INVADER_SPACING_X = 2.6;
export const INVADER_SPACING_Z = 2.4;
export const INVADER_START_Z = -16;
export const INVADER_STEP_X = 0.8;
export const INVADER_ADVANCE_Z = 1.2;
// 編隊フル残存時のステップ間隔(秒)。残数が減るほど短くなる
export const INVADER_STEP_INTERVAL_MAX = 0.9;
export const INVADER_STEP_INTERVAL_MIN = 0.07;
export const INVADER_BULLET_SPEED = 14;
// 1秒あたりの敵弾発射確率の基準値(ウェーブで上昇)
export const INVADER_FIRE_RATE = 0.55;
// 敵編隊がこのZ座標に達したらゲームオーバー
export const INVASION_Z = PLAYER_Z - 2.5;

export const START_LIVES = 3;
export const WAVE_CLEAR_DELAY = 2.0;

// 行ごとの敵タイプ: [最上段, ..., 最下段] → 点数
export const INVADER_TYPES = [
  { score: 30, color: 0xff5fd0 }, // squid
  { score: 20, color: 0x6fd6ff }, // crab
  { score: 20, color: 0x6fd6ff },
  { score: 10, color: 0x7dffb0 }, // octopus
  { score: 10, color: 0x7dffb0 },
];
