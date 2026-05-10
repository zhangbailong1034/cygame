const SFX_FILES = {
  click: 'audio/click.mp3',
  place_ok: 'audio/place_ok.mp3',
  place_fail: 'audio/place_fail.mp3',
  complete: 'audio/complete.mp3',
  hint: 'audio/hint.mp3',
  sign: 'audio/sign.mp3',
};

const BGM_FILES = {
  menu: 'audio/bgm_menu.mp3',
  game: 'audio/bgm_game.mp3',
};

export class SoundManager {
  constructor() {
    this._bgmCtx = null;
    this._sfxCtx = null;
    this._muted = false;
    this._currentBgm = null;
    this._audioUnlocked = false;
  }

  init() {
    try {
      this._muted = wx.getStorageSync('sound_muted') || false;
    } catch (e) { this._muted = false; }
    try { GameGlobal.databus.soundMuted = this._muted; } catch (e) {}
  }

  unlockAudio() {
    if (this._audioUnlocked) return;
    try {
      this._bgmCtx = wx.createInnerAudioContext();
      this._bgmCtx.volume = this._muted ? 0 : 0.6;
    } catch (e) { this._bgmCtx = null; }
    try {
      this._sfxCtx = wx.createInnerAudioContext();
      this._sfxCtx.volume = this._muted ? 0 : 1.0;
    } catch (e) { this._sfxCtx = null; }
    this._audioUnlocked = true;
  }

  playBgm(scene) {
    try {
      this.unlockAudio();
      if (!this._bgmCtx) return;
      const src = BGM_FILES[scene];
      if (!src) return;
      if (this._currentBgm === src) return;
      this._currentBgm = src;
      try { this._bgmCtx.stop(); } catch (e) {}
      this._bgmCtx.src = src;
      this._bgmCtx.loop = true;
      try { const p = this._bgmCtx.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    } catch (e) {}
  }

  stopBgm() {
    try {
      if (this._bgmCtx) {
        this._bgmCtx.stop();
        this._currentBgm = null;
      }
    } catch (e) {}
  }

  playSfx(name) {
    try {
      this.unlockAudio();
      if (!this._sfxCtx) return;
      const src = SFX_FILES[name];
      if (!src) return;
      try { this._sfxCtx.stop(); } catch (e) {}
      this._sfxCtx.src = src;
      try { const p = this._sfxCtx.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    } catch (e) {}
  }

  toggleMute() {
    this._muted = !this._muted;
    try { GameGlobal.databus.soundMuted = this._muted; } catch (e) {}
    try { wx.setStorageSync('sound_muted', this._muted); } catch (e) {}
    try {
      const vol = this._muted ? 0 : 0.6;
      if (this._bgmCtx) this._bgmCtx.volume = vol;
      if (this._sfxCtx) this._sfxCtx.volume = this._muted ? 0 : 1.0;
    } catch (e) {}
  }

  get muted() { return this._muted; }
}
