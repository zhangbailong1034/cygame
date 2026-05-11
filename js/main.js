import DataBus, { ScreenState } from './databus';
import { Grid } from './game/Grid';
import { FragmentBar } from './game/FragmentBar';
import { HUD } from './ui/HUD';
import { MenuScreen } from './game/MenuScreen';
import { Editor } from './game/Editor';
import { api } from './api/index';
import { Dialog } from './ui/Dialog';
import { Toast } from './ui/Toast';
import { AdManager } from './ads/AdManager';
import { SoundManager } from './audio/SoundManager';
import { DailySign } from './game/DailySign';
import { Tutorial } from './game/Tutorial';

const ctx = canvas.getContext('2d');
GameGlobal.databus = new DataBus();

export default class Main {
  constructor() {
    this.grid = new Grid();
    this.fragmentBar = new FragmentBar();
    this.hud = new HUD();
    this.menu = new MenuScreen();
    this.editor = new Editor();
    this.dialog = new Dialog();
    this.toast = new Toast();
    this.adManager = new AdManager();
    this.soundManager = new SoundManager();
    this.dailySign = new DailySign();
    this.tutorial = new Tutorial();

    this.api = api;
    this.adManager.init();
    this.soundManager.init();
    this.staminaTimer = 0;

    // Game-level scroll state (PLAYING screen)
    this.gameScrollY = 0;
    this._gameMaxScrollY = 0;
    this._gameContentH = 0;
    this._gameDragStartY = 0;
    this._gameDragStartScrollY = 0;
    this._gameWasDrag = false;
    this._gameTouchActive = false;
    this._gameVelocity = 0;
    this._gameLastTouchY = 0;
    this._gameLastTouchTime = 0;
    this._gameInertiaId = 0;

    console.log('[Main] canvas:', canvas.width, 'x', canvas.height);
    this.initTouchHandler();
    this.loop = this.loop.bind(this);
    GameGlobal.main = this;
    this.init();
    this.aniId = requestAnimationFrame(this.loop);
  }

  async init() {
    const db = GameGlobal.databus;
    const openId = 'user_' + Math.random().toString(36).slice(2, 10);
    try {
      const loginRes = await api.login(openId);
      api.setToken(loginRes.token);
      db.userId = openId;
      db.stamina = loginRes.user.stamina;
      db.totalScore = loginRes.user.total_score;
      db.currentLevel = loginRes.user.current_level;
      db.todaySigned = loginRes.user.todaySigned;
      db.signStreak = loginRes.user.signStreak;
      db.screen = ScreenState.MENU;
      await this.menu.loadLevels();
    } catch (e) {
      db.showToast('连接服务器失败，请确认后端已启动');
    }
  }

  initTouchHandler() {
    wx.onTouchStart((e) => {
      const touch = e.touches[0];
      const db = GameGlobal.databus;
      if (db.screen === ScreenState.MENU) {
        this.menu.onTouchStart(touch.clientX, touch.clientY);
      } else if (db.screen === ScreenState.PLAYING && !this.dialog.visible) {
        this._gameOnTouchStart(touch.clientX, touch.clientY);
      }
      this.handleTouch(touch.clientX, touch.clientY);
    });
    wx.onTouchMove((e) => {
      const touch = e.touches[0];
      const db = GameGlobal.databus;
      if (db.screen === ScreenState.MENU && !this.dailySign.visible && !this.dialog.visible) {
        this.menu.onTouchMove(touch.clientX, touch.clientY);
      } else if (db.screen === ScreenState.PLAYING && !this.dialog.visible) {
        this._gameOnTouchMove(touch.clientX, touch.clientY);
      }
    });
    wx.onTouchEnd((e) => {
      const touch = e.changedTouches[0];
      const db = GameGlobal.databus;
      if (db.screen === ScreenState.MENU && !this.dailySign.visible && !this.dialog.visible) {
        this.menu.onTouchEnd(touch.clientX, touch.clientY);
      } else if (db.screen === ScreenState.PLAYING && !this.dialog.visible) {
        this._gameOnTouchEnd(touch.clientX, touch.clientY);
      }
    });
  }

  // --- Game scroll touch handlers ---

  _gameScrollAreaTop() {
    return this.hud.headerH;
  }

  _gameScrollAreaBottom() {
    return this.hud.yBottom - 8;
  }

  _isInGameScrollArea(x, y) {
    if (y < this._gameScrollAreaTop()) return false;
    if (y >= this._gameScrollAreaBottom()) return false;
    if (this.hud.hitTestHeader(x, y)) return false;
    return true;
  }

  _gameOnTouchStart(x, y) {
    if (this.tutorial.active) return;
    if (!this._isInGameScrollArea(x, y)) return;
    this._gameInertiaId++;
    this._gameTouchActive = true;
    this._gameDragStartY = y;
    this._gameDragStartScrollY = this.gameScrollY;
    this._gameWasDrag = false;
    this._gameVelocity = 0;
    this._gameLastTouchY = y;
    this._gameLastTouchTime = Date.now();
  }

  _gameOnTouchMove(x, y) {
    if (!this._gameTouchActive || this._gameMaxScrollY <= 0) return;
    const dy = this._gameDragStartY - y;
    if (Math.abs(dy) > 8) {
      this._gameWasDrag = true;
    }
    if (!this._gameWasDrag) return;
    this.gameScrollY = Math.max(0, Math.min(this._gameMaxScrollY,
      this._gameDragStartScrollY + dy));

    const now = Date.now();
    const dt = now - this._gameLastTouchTime;
    if (dt > 0) {
      this._gameVelocity = (this._gameLastTouchY - y) / dt;
    }
    this._gameLastTouchY = y;
    this._gameLastTouchTime = now;
  }

  _gameOnTouchEnd(x, y) {
    if (this.tutorial.active) { this._gameTouchActive = false; return; }
    if (!this._gameTouchActive) return;
    this._gameTouchActive = false;
    if (this._gameWasDrag) {
      this._gameApplyInertia();
      return;
    }
    // Tap — route to grid or fragments with scroll-adjusted Y
    const sy = y + this.gameScrollY;
    if (this.fragmentBar.getFragmentAt(x, sy)) {
      // fragmentBar.onTouch uses screen y internally, but getFragmentAt already
      // accounts for scroll. We call onTouch with adjusted y so hitTest works.
      this.fragmentBar.onTouch(x, sy);
      return;
    }
    if (this.grid.hitTest(x, sy)) {
      this.grid.onTouch(x, sy);
      return;
    }
  }

  _gameApplyInertia() {
    let v = this._gameVelocity;
    const decay = 0.92;
    const id = ++this._gameInertiaId;
    const step = () => {
      if (id !== this._gameInertiaId) return;
      v *= decay;
      this.gameScrollY = Math.max(0, Math.min(this._gameMaxScrollY,
        this.gameScrollY - v * 16));
      if (Math.abs(v) > 0.05 && this.gameScrollY > 0 &&
          this.gameScrollY < this._gameMaxScrollY) {
        requestAnimationFrame(step);
      } else {
        this.gameScrollY = Math.max(0, Math.min(this._gameMaxScrollY,
          Math.round(this.gameScrollY)));
      }
    };
    requestAnimationFrame(step);
  }

  _gameUpdateScrollMetrics() {
    const fragBottom = this.fragmentBar.getBottomY();
    const viewportBottom = this._gameScrollAreaBottom();
    this._gameContentH = fragBottom;
    this._gameMaxScrollY = Math.max(0, this._gameContentH - viewportBottom);
    if (this.gameScrollY > this._gameMaxScrollY) {
      this.gameScrollY = this._gameMaxScrollY;
    }
  }

  handleTouch(x, y) {
    try {
      this._handleTouch(x, y);
    } catch (e) {
      console.log('[Main] touch error:', e);
    }
  }

  _handleTouch(x, y) {
    const db = GameGlobal.databus;

    this.soundManager.unlockAudio();

    if (this.tutorial.active) {
      this.tutorial.onTouch(x, y);
      this.soundManager.playSfx('click');
      return;
    }

    if (this.dailySign.visible && db.screen === ScreenState.MENU) {
      this.dailySign.onTouch(x, y);
      return;
    }

    if (!this.dialog.visible) {
      this.soundManager.playSfx('click');
    }

    if (this.dialog.visible) {
      const hit = this.dialog.hitTest(x, y);
      if (!hit) return;
      if (hit.onClick) { hit.onClick(); return; }
      if (hit.type === 'learn' || hit.type === 'idiom') {
        this.dialog.expandedIdx = this.dialog.expandedIdx === hit.idx ? -1 : hit.idx;
        return;
      }
      if (hit.type === 'save') {
        const idiom = this.dialog.idioms[this.dialog.expandedIdx];
        if (idiom && !db.savedIdioms.some(s => s.answer === idiom.answer)) {
          db.savedIdioms.push({ answer: idiom.answer, meaning: idiom.meaning });
          db.showToast('已记录：' + idiom.answer);
        }
        return;
      }
      if (hit.type === 'share') {
        const idiom = this.dialog.idioms[this.dialog.expandedIdx];
        if (idiom) {
          try { wx.shareAppMessage({ title: idiom.answer + ' - ' + idiom.meaning }); } catch (e) {}
          db.showToast('已分享：' + idiom.answer);
        }
        return;
      }
      return;
    }

    if (db.screen === ScreenState.MENU) {
      return; // tap processed on touchend
    }

    if (db.screen === ScreenState.EDITOR) {
      this.editor.onTouch(x, y);
      return;
    }

    // PLAYING: HUD buttons process immediately, scroll area deferred
    if (this.hud.hitTest(x, y)) {
      this.hud.onTouch(x, y);
      return;
    }
    // Scroll area touches deferred to touchend
    if (this._isInGameScrollArea(x, y)) {
      return;
    }
  }

  update(dt) {
    const db = GameGlobal.databus;

    this.staminaTimer += dt;
    if (this.staminaTimer >= 30000 && db.screen === ScreenState.PLAYING) {
      this.staminaTimer = 0;
      api.recoverStamina().then(res => { db.stamina = res.stamina; });
    }

    if (db.toastTimer > 0) {
      db.toastTimer -= dt;
      if (db.toastTimer <= 0) db.toastMessage = '';
    }
  }

  render() {
    const db = GameGlobal.databus;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#f8f3e8');
    bgGrad.addColorStop(0.5, '#f0ece0');
    bgGrad.addColorStop(1, '#e8e2d4');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (db.screen === ScreenState.MENU) {
      this.soundManager.playBgm('menu');
      this.adManager.showBanner();
      this.menu.draw(ctx);
    } else if (db.screen === ScreenState.EDITOR) {
      this.adManager.hideBanner();
      this.soundManager.stopBgm();
      this.editor.draw(ctx);
    } else {
      this.adManager.hideBanner();
      this.soundManager.playBgm('game');
      if (!db.tutorialDone && !this.tutorial.active && db.levelId === 1) {
        this.tutorial.start();
      }
      this._renderGame(ctx);
    }

    this.toast.draw(ctx);
    this.dailySign.draw(ctx);
    this.tutorial.draw(ctx);
    this.dialog.draw(ctx);
  }

  _renderGame(ctx) {
    this.hud.getLayout();
    // Reset scroll when entering a new level
    if (this._lastLevelId !== GameGlobal.databus.levelId) {
      this._lastLevelId = GameGlobal.databus.levelId;
      this.gameScrollY = 0;
    }
    this._gameUpdateScrollMetrics();
    const sy = this.gameScrollY;

    // Fixed header
    this.hud.drawHeader(ctx);

    // Scrollable middle section (status + grid + fragments)
    ctx.save();
    ctx.beginPath();
    const clipTop = this.hud.headerH;
    const clipBottom = this._gameScrollAreaBottom();
    ctx.rect(0, clipTop, canvas.width, clipBottom - clipTop);
    ctx.clip();
    ctx.translate(0, -sy);

    this.hud.drawStatus(ctx);
    this.grid.draw(ctx);
    this.fragmentBar.draw(ctx);

    ctx.restore();

    // Fixed bottom bar
    this.hud.drawBottom(ctx);

    // Scrollbar
    if (this._gameMaxScrollY > 0) {
      this._drawGameScrollbar(ctx);
    }
  }

  _drawGameScrollbar(ctx) {
    const barW = 4;
    const barX = canvas.width - barW - 4;
    const trackTop = this.hud.headerH;
    const trackH = this._gameScrollAreaBottom() - trackTop;
    const thumbH = Math.max(32, trackH * (trackH / this._gameContentH));
    const thumbTravel = trackH - thumbH;
    const thumbY = trackTop + (this.gameScrollY / this._gameMaxScrollY) * thumbTravel;

    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    this._roundRect(ctx, barX, trackTop, barW, trackH, barW / 2);
    ctx.fill();

    if (thumbH < trackH) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      this._roundRect(ctx, barX, thumbY, barW, thumbH, barW / 2);
      ctx.fill();
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  loop() {
    this.update(1000 / 60);
    this.render();
    requestAnimationFrame(this.loop);
  }
}
