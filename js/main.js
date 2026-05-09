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

    console.log('[Main] 游戏启动中... canvas:', canvas.width, 'x', canvas.height);
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
      this.handleTouch(touch.x, touch.y);
    });
  }

  handleTouch(x, y) {
    const db = GameGlobal.databus;

    if (this.dialog.visible) {
      const btn = this.dialog.hitTest(x, y);
      if (btn && btn.onClick) { btn.onClick(); return; }
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

    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (db.screen === ScreenState.MENU) {
      if (!this._renderCount) { this._renderCount = 0; }
      if (this._renderCount++ === 0) console.log('[Render] 首帧渲染, screen:', db.screen);
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
