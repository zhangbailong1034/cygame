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
      this.handleTouch(touch.clientX, touch.clientY);
    });
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

    // 首次触摸解锁音频
    this.soundManager.unlockAudio();

    // 引导遮罩拦截所有触摸
    if (this.tutorial.active) {
      this.tutorial.onTouch(x, y);
      this.soundManager.playSfx('click');
      return;
    }

    // 签到面板拦截（仅菜单页）
    if (this.dailySign.visible && db.screen === ScreenState.MENU) {
      this.dailySign.onTouch(x, y);
      return;
    }

    // 所有触摸播放点击音效
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
          try { wx.shareAppMessage({ title: idiom.answer + ' - ' + idiom.meaning }); } catch (e) { /* ignore */ }
          db.showToast('已分享：' + idiom.answer);
        }
        return;
      }
      return;
    }

    if (db.screen === ScreenState.MENU) {
      this.menu.onTouch(x, y);
      return;
    }

    if (db.screen === ScreenState.EDITOR) {
      this.editor.onTouch(x, y);
      return;
    }

    if (this.hud.hitTest(x, y)) {
      this.hud.onTouch(x, y);
      return;
    }
    if (this.fragmentBar.hitTest(x, y)) {
      this.fragmentBar.onTouch(x, y);
      return;
    }
    if (this.grid.hitTest(x, y)) {
      this.grid.onTouch(x, y);
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

    // Background: warm gradient with subtle texture effect
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
      this.grid.draw(ctx);
      this.fragmentBar.draw(ctx);
      this.hud.draw(ctx);
    }

    this.toast.draw(ctx);
    this.dailySign.draw(ctx);
    this.tutorial.draw(ctx);
    this.dialog.draw(ctx);
  }

  loop() {
    this.update(1000 / 60);
    this.render();
    requestAnimationFrame(this.loop);
  }
}
