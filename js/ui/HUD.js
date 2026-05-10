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
    this.statusH = 56;

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
      this.muteBtn.text = GameGlobal.main.soundManager.muted ? '🔇' : '🔊';
    };

    this.allButtons = [this.hintBtn, this.shuffleBtn, this.resetBtn, this.backBtn, this.muteBtn];
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

  draw(ctx) {
    this.getLayout();
    const db = GameGlobal.databus;
    const emptyCells = this._countEmpty(db);

    // === Header bar ===
    const headerGrad = ctx.createLinearGradient(0, 0, 0, this.headerH);
    headerGrad.addColorStop(0, '#4a6fa5');
    headerGrad.addColorStop(1, '#3b5998');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, this.headerH);

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, this.headerH, SCREEN_WIDTH, 2);

    // Back button
    this.backBtn.draw(ctx);

    // Level title (with preview badge if applicable)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';
    const titleText = '第 ' + db.levelId + ' 关' + (db.previewMode ? '  [预览]' : '');
    ctx.fillText(titleText, SCREEN_WIDTH / 2, this.headerH / 2 + 7);

    // Score in header (right)
    ctx.fillStyle = '#ffe0a0';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('⭐ ' + db.totalScore, SCREEN_WIDTH - 14, this.headerH / 2 + 6);

    // === Status area (three lines, between header and grid) ===
    const statusY = this.headerH;
    const total = db.rows * db.cols;
    const progress = total > 0 ? Math.round((total - emptyCells) / total * 100) : 0;
    const hearts = '❤️'.repeat(Math.max(0, db.stamina));

    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(0, statusY, SCREEN_WIDTH, this.statusH);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, statusY + this.statusH, SCREEN_WIDTH, 1);

    const lineH = 18;
    const leftPad = 16;

    // Line 1: Stamina
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#e06060';
    ctx.textAlign = 'left';
    const staminaText = db.stamina > 0 ? hearts + ' ×' + db.stamina : '💔 体力耗尽';
    ctx.fillText(staminaText, leftPad, statusY + 13);

    // Line 2: Remaining
    ctx.fillStyle = emptyCells > 0 ? '#4a90d9' : '#4caf50';
    ctx.fillText('🀫 剩余空格：' + emptyCells + ' 格', leftPad, statusY + 13 + lineH);

    // Line 3: Progress bar
    const progBarW = 100;
    const progBarX = leftPad;
    const progBarY = statusY + 13 + lineH * 2 - 4;
    const progBarH = 8;
    // Progress bar background
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.moveTo(progBarX + 4, progBarY);
    ctx.lineTo(progBarX + progBarW - 4, progBarY);
    ctx.quadraticCurveTo(progBarX + progBarW, progBarY, progBarX + progBarW, progBarY + progBarH / 2);
    ctx.quadraticCurveTo(progBarX + progBarW, progBarY + progBarH, progBarX + progBarW - 4, progBarY + progBarH);
    ctx.lineTo(progBarX + 4, progBarY + progBarH);
    ctx.quadraticCurveTo(progBarX, progBarY + progBarH, progBarX, progBarY + progBarH / 2);
    ctx.quadraticCurveTo(progBarX, progBarY, progBarX + 4, progBarY);
    ctx.closePath();
    ctx.fill();
    // Progress bar fill
    const fillW = Math.max(0, (progBarW - 0) * progress / 100);
    if (fillW > 0) {
      const fillColor = progress === 100 ? '#4caf50' : '#e8a840';
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(progBarX + 4, progBarY);
      ctx.lineTo(progBarX + Math.min(fillW, progBarW) - 4, progBarY);
      ctx.quadraticCurveTo(progBarX + Math.min(fillW, progBarW), progBarY, progBarX + Math.min(fillW, progBarW), progBarY + progBarH / 2);
      ctx.quadraticCurveTo(progBarX + Math.min(fillW, progBarW), progBarY + progBarH, progBarX + Math.min(fillW, progBarW) - 4, progBarY + progBarH);
      ctx.lineTo(progBarX + 4, progBarY + progBarH);
      ctx.quadraticCurveTo(progBarX, progBarY + progBarH, progBarX, progBarY + progBarH / 2);
      ctx.quadraticCurveTo(progBarX, progBarY, progBarX + 4, progBarY);
      ctx.closePath();
      ctx.fill();
    }
    // Progress percentage text
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('完成 ' + progress + '%', SCREEN_WIDTH - 16, statusY + 13 + lineH * 2 + 2);

    // === Bottom bar background ===
    const barTop = this.yBottom - 8;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(0, barTop, SCREEN_WIDTH, SCREEN_HEIGHT - barTop);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, barTop, SCREEN_WIDTH, 1);

    for (const btn of [this.hintBtn, this.shuffleBtn, this.resetBtn]) {
      btn.draw(ctx);
    }
  }

  hitTest(px, py) {
    this.getLayout();
    for (const b of this.allButtons) {
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
