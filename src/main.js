import { Game } from './game.js';

const game = new Game(document.getElementById('app'));
// デバッグ・自動テスト用に公開
window.__game = game;
