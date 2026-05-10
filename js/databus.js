import './render';

let instance;

export const ScreenState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  EDITOR: 'EDITOR',
};

export const PlaceState = {
  IDLE: 'IDLE',
  SELECTING_CELLS: 'SELECTING_CELLS',
};

export default class DataBus {
  screen = ScreenState.MENU;

  userId = '';
  stamina = 10;
  totalScore = 0;
  currentLevel = 1;

  levelId = 1;
  rows = 0;
  cols = 0;
  gridState = [];
  fragments = [];
  distractors = [];
  usedFragments = [];
  levels = [];

  placeState = PlaceState.IDLE;
  selectedFragment = null;
  firstCell = null;

  toastMessage = '';
  toastTimer = 0;

  isEditor = false;
  previewMode = false;

  savedIdioms = []; // { answer, meaning }

  // 广告 & 签到
  hintCards = 0;
  todaySigned = false;
  signStreak = 0;

  // 音效
  soundMuted = false;

  // 引导
  tutorialDone = false;

  constructor() {
    if (instance) return instance;
    instance = this;
  }

  showToast(msg, duration = 2000) {
    this.toastMessage = msg;
    this.toastTimer = duration;
  }

  reset() {
    this.placeState = PlaceState.IDLE;
    this.selectedFragment = null;
    this.firstCell = null;
  }
}
