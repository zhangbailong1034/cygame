import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { Button } from './Button';
import { api } from '../api/index';

export class HUD {
  constructor() {
    this.yTop = 5;
    this.btnH = 32;
    this.btnW = 70;
    this.gap = 8;

    this.hintBtn = new Button(0, 0, this.btnW, this.btnH, '提示', '#e8a840');
    this.shuffleBtn = new Button(0, 0, this.btnW, this.btnH, '洗牌', '#6c9bd2');
    this.resetBtn = new Button(0, 0, this.btnW, this.btnH, '重置', '#d94a4a');

    this.hintBtn.onClick = () => this.handleHint();
    this.shuffleBtn.onClick = () => this.handleShuffle();
    this.resetBtn.onClick = () => this.handleReset();

    this.allButtons = [this.hintBtn, this.shuffleBtn, this.resetBtn];
  }

  getLayout() {
    const totalW = this.btnW * 3 + this.gap * 2;
    const startX = (SCREEN_WIDTH - totalW) / 2;
    const btnY = SCREEN_HEIGHT - this.btnH - 10;

    this.hintBtn.x = startX;
    this.hintBtn.y = btnY;
    this.shuffleBtn.x = startX + this.btnW + this.gap;
    this.shuffleBtn.y = btnY;
    this.resetBtn.x = startX + (this.btnW + this.gap) * 2;
    this.resetBtn.y = btnY;

    this.yBottom = btnY;
  }

  draw(ctx) {
    this.getLayout();
    const db = GameGlobal.databus;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SCREEN_WIDTH, 48);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(SCREEN_WIDTH, 48);
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('第 ' + db.levelId + ' 关', 12, 26);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#e06060';
    const hearts = '❤️'.repeat(Math.max(0, db.stamina));
    ctx.fillText(hearts, SCREEN_WIDTH - 60, 26);

    ctx.fillStyle = '#e8a840';
    ctx.fillText('⭐ ' + db.totalScore, SCREEN_WIDTH - 12, 26);

    const barTop = this.yBottom - 6;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, barTop, SCREEN_WIDTH, SCREEN_HEIGHT - barTop);
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(0, barTop);
    ctx.lineTo(SCREEN_WIDTH, barTop);
    ctx.stroke();

    for (const btn of this.allButtons) {
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

  handleHint() {
    const db = GameGlobal.databus;
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
    db.fragments.sort(() => Math.random() - 0.5);
    db.totalScore = Math.max(0, db.totalScore - 5);
    db.showToast('已重新排列碎片 (-5 分)');
  }

  handleReset() {
    const db = GameGlobal.databus;
    api.resetLevel(db.levelId).then(res => {
      db.stamina = res.stamina;
    });
    api.getLevelData(db.levelId).then(data => {
      db.gridState = data.gridState;
      db.fragments = data.fragments;
      db.distractors = data.distractors;
      db.reset();
      db.showToast('关卡已重置');
    });
  }
}
