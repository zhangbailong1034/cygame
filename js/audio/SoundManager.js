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
    GameGlobal.databus.soundMuted = this._muted;
  }

  unlockAudio() {
    if (this._audioUnlocked) return;
    this._audioUnlocked = true;
    this._bgmCtx = wx.createInnerAudioContext();
    this._bgmCtx.volume = this._muted ? 0 : 0.6;
    this._sfxCtx = wx.createInnerAudioContext();
    this._sfxCtx.volume = this._muted ? 0 : 1.0;
  }

  playBgm(scene) {
    this.unlockAudio();
    if (!this._bgmCtx) return;
    const src = BGM_FILES[scene];
    if (!src) return;
    if (this._currentBgm === src) return;
    this._currentBgm = src;
    this._bgmCtx.stop();
    this._bgmCtx.src = src;
    this._bgmCtx.loop = true;
    this._bgmCtx.play().catch(() => {});
  }

  stopBgm() {
    if (this._bgmCtx) {
      this._bgmCtx.stop();
      this._currentBgm = null;
    }
  }

  playSfx(name) {
    this.unlockAudio();
    if (!this._sfxCtx) return;
    const src = SFX_FILES[name];
    if (!src) return;
    this._sfxCtx.stop();
    this._sfxCtx.src = src;
    this._sfxCtx.play().catch(() => {});
  }

  toggleMute() {
    this._muted = !this._muted;
    GameGlobal.databus.soundMuted = this._muted;
    try { wx.setStorageSync('sound_muted', this._muted); } catch (e) {}
    const vol = this._muted ? 0 : 0.6;
    if (this._bgmCtx) this._bgmCtx.volume = vol;
    if (this._sfxCtx) this._sfxCtx.volume = this._muted ? 0 : 1.0;
  }

  get muted() { return this._muted; }
}
