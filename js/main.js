import DataBus, { ScreenState } from './databus';
import { Grid } from './game/Grid';
import { FragmentBar } from './game/FragmentBar';
import { HUD } from './ui/HUD';
import { MenuScreen } from './game/MenuScreen';
import { Editor } from './game/Editor';
import { api } from './api/index';
import { Dialog } from './ui/Dialog';
import { Toast } from './ui/Toast';

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
    const db = GameGlobal.databus;

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
      this.menu.draw(ctx);
    } else if (db.screen === ScreenState.EDITOR) {
      this.editor.draw(ctx);
    } else {
      this.grid.draw(ctx);
      this.fragmentBar.draw(ctx);
      this.hud.draw(ctx);
    }

    this.toast.draw(ctx);
    this.dialog.draw(ctx);
  }

  loop() {
    this.update(1000 / 60);
    this.render();
    requestAnimationFrame(this.loop);
  }
}
