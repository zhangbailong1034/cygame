import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { ScreenState } from '../databus';
import { Button } from './Button';
import { api } from '../api/index';

export class HUD {
  constructor() {
    this.btnH = 34;
    this.btnW = 72;
    this.gap = 10;
    this.headerH = 50;
    this.statusH = 72;
    this.progress = 0;
    this.emptyCells = 0;

    this.backBtn = new Button(0, 0, 50, 28, '← 返回', 'rgba(255,255,255,0.22)');
    this.backBtn.onClick = () => this.handleBack();

    this.hintBtn = new Button(0, 0, this.btnW, this.btnH, '提示', '#e8a840');
    this.shuffleBtn = new Button(0, 0, this.btnW, this.btnH, '洗牌', '#6c9bd2');
    this.resetBtn = new Button(0, 0, this.btnW, this.btnH, '重置', '#d94a4a');

    this.hintBtn.onClick = () => this.handleHint();
    this.shuffleBtn.onClick = () => this.handleShuffle();
    this.resetBtn.onClick = () => this.handleReset();

    this.muteBtn = new Button(0, 0, 38, 28, '🔊', 'rgba(255,255,255,0.22)');
    this.muteBtn.onClick = () => {
      GameGlobal.main.soundManager.toggleMute();
      this.muteBtn.label = GameGlobal.main.soundManager.muted ? '🔇' : '🔊';
    };

    this.headerButtons = [this.backBtn, this.muteBtn];
    this.bottomButtons = [this.hintBtn, this.shuffleBtn, this.resetBtn];
    this.allButtons = [...this.headerButtons, ...this.bottomButtons];
  }

  getLayout() {
    const totalW = this.btnW * 3 + this.gap * 2;
    const startX = (SCREEN_WIDTH - totalW) / 2;
    const btnY = SCREEN_HEIGHT - this.btnH - 12;

    this.hintBtn.x = startX;
    this.hintBtn.y = btnY;
    this.shuffleBtn.x = startX + this.btnW + this.gap;
    this.shuffleBtn.y = btnY;
    this.resetBtn.x = startX + (this.btnW + this.gap) * 2;
    this.resetBtn.y = btnY;

    this.backBtn.x = 8;
    this.backBtn.y = (this.headerH - 28) / 2;

    this.muteBtn.x = 62;
    this.muteBtn.y = (this.headerH - 28) / 2;

    this.yBottom = btnY;

    const db = GameGlobal.databus;
    this.emptyCells = this._countEmpty(db);
    const total = db.rows * db.cols;
    this.progress = total > 0 ? Math.round((total - this.emptyCells) / total * 100) : 0;
  }

  _countEmpty(db) {
    let filled = 0;
    const total = db.rows * db.cols;
    for (let r = 0; r < db.rows; r++) {
      for (let c = 0; c < db.cols; c++) {
        if (db.gridState[r] && db.gridState[r][c]) filled++;
      }
    }
    return total - filled;
  }

  _drawRoundedBar(ctx, x, y, w, h, color) {
    const r = h / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
  }

  // --- Fixed header: drawn at screen top, never scrolls ---

  drawHeader(ctx) {
    const db = GameGlobal.databus;

    const headerGrad = ctx.createLinearGradient(0, 0, 0, this.headerH);
    headerGrad.addColorStop(0, '#4a6fa5');
    headerGrad.addColorStop(1, '#3b5998');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, this.headerH);

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, this.headerH, SCREEN_WIDTH, 2);

    this.backBtn.draw(ctx);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';
    const titleText = '第 ' + db.levelId + ' 关' + (db.previewMode ? '  [预览]' : '');
    ctx.fillText(titleText, SCREEN_WIDTH / 2, this.headerH / 2 + 7);

    ctx.fillStyle = '#ffe0a0';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⭐ ' + db.totalScore, SCREEN_WIDTH - 14, this.headerH / 2 + 6);
  }

  // --- Status area: scrolls with grid and fragments ---

  drawStatus(ctx) {
    const db = GameGlobal.databus;
    const hearts = '❤️'.repeat(Math.max(0, db.stamina));

    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(0, this.headerH, SCREEN_WIDTH, this.statusH);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, this.headerH + this.statusH, SCREEN_WIDTH, 1);

    const padX = 14;
    const padTop = 8;
    const lineH = 20;
    const textY1 = this.headerH + padTop + 14;
    const textY2 = textY1 + lineH;

    // Line 1: Stamina
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#e06060';
    ctx.textAlign = 'left';
    const staminaText = db.stamina > 0 ? hearts + ' ×' + db.stamina : '💔 体力耗尽';
    ctx.fillText(staminaText, padX, textY1);

    // Line 2: Remaining empty cells
    ctx.fillStyle = this.emptyCells > 0 ? '#4a90d9' : '#4caf50';
    ctx.fillText('🔫 剩余空格：' + this.emptyCells + ' 格', padX, textY2);

    // Progress bar
    const progBarH = 8;
    const progBarPadY = 8;
    const progBarY = textY2 + progBarPadY + 4;
    const progBarX = padX;
    const progBarW = Math.min(SCREEN_WIDTH - padX * 2, 240);

    this._drawRoundedBar(ctx, progBarX, progBarY, progBarW, progBarH, '#e8e8e8');

    const fillW = Math.max(progBarH, progBarW * this.progress / 100);
    if (this.progress > 0) {
      const fillColor = this.progress === 100 ? '#4caf50' : '#e8a840';
      this._drawRoundedBar(ctx, progBarX, progBarY, fillW, progBarH, fillColor);
    }

    ctx.textAlign = 'left';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(this.progress + '%', progBarX + progBarW + 6, progBarY + progBarH / 2 + 4);
  }

  // --- Bottom bar: fixed at screen bottom, never scrolls ---

  drawBottom(ctx) {
    const barTop = this.yBottom - 8;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(0, barTop, SCREEN_WIDTH, SCREEN_HEIGHT - barTop);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, barTop, SCREEN_WIDTH, 1);

    for (const btn of this.bottomButtons) {
      btn.draw(ctx);
    }
  }

  // Convenience: draw everything (used by original flow if needed)
  draw(ctx) {
    this.drawHeader(ctx);
    this.drawStatus(ctx);
    this.drawBottom(ctx);
  }

  // --- Hit testing ---

  hitTest(px, py) {
    this.getLayout();
    for (const b of this.allButtons) {
      if (b.hitTest(px, py)) return true;
    }
    return false;
  }

  hitTestBottom(px, py) {
    this.getLayout();
    for (const b of this.bottomButtons) {
      if (b.hitTest(px, py)) return true;
    }
    return false;
  }

  hitTestHeader(px, py) {
    this.getLayout();
    for (const b of this.headerButtons) {
      if (b.hitTest(px, py)) return true;
    }
    return false;
  }

  onTouch(x, y) {
    this.getLayout();
    for (const b of this.allButtons) {
      if (b.hitTest(x, y) && b.onClick) { b.onClick(); return; }
    }
  }

  handleBack() {
    const db = GameGlobal.databus;
    db.reset();
    db.screen = ScreenState.MENU;
    GameGlobal.main.menu.loadLevels();
  }

  handleHint() {
    const db = GameGlobal.databus;
    if (db.previewMode) { db.showToast('预览模式，无法使用提示'); return; }
    if (!db.firstCell) {
      db.showToast('请先点击一个空格再点提示');
      return;
    }
    const cell = db.firstCell;
    api.useHint(db.levelId, cell.row, cell.col, 'highlight').then(res => {
      db.showToast('正确碎片: ' + res.fragmentText);
      db.totalScore = res.totalScore;
    }).catch(() => db.showToast('提示失败'));
  }

  handleShuffle() {
    const db = GameGlobal.databus;
    if (db.previewMode) { db.showToast('预览模式，无法操作'); return; }
    db.fragments.sort(() => Math.random() - 0.5);
    db.totalScore = Math.max(0, db.totalScore - 5);
    db.showToast('已重新排列碎片 (-5 分)');
  }

  handleReset() {
    const db = GameGlobal.databus;
    if (db.previewMode) { db.showToast('预览模式，无法操作'); return; }
    api.resetLevel(db.levelId).then(res => {
      db.stamina = res.stamina;
    });
    api.getLevelData(db.levelId).then(data => {
      db.gridState = data.gridState;
      db.fragments = data.fragments.map((f, i) => ({
        ...f,
        uid: f.uid || (f.text + '_' + (f.positions ? JSON.stringify(f.positions) : i)),
      }));
      db.distractors = data.distractors.map((d, i) => ({
        ...d,
        uid: d.uid || ('dist_' + d.text + '_' + i),
      }));
      db.reset();
      db.showToast('关卡已重置');
    });
  }
}
