import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { Button } from '../ui/Button';

const STEPS = [
  {
    text: '这是成语填字网格\n固定字已帮你填好',
    highlight: 'grid',
  },
  {
    text: '从下方碎片区选择\n正确的字或词',
    highlight: 'fragments',
  },
  {
    text: '点击碎片选中\n再点击空格放入',
    highlight: 'demo',
  },
  {
    text: '提示、洗牌、重置\n帮你过关',
    highlight: 'buttons',
  },
  {
    text: '体力用完就不能操作了哦\n可以通过签到和广告恢复',
    highlight: 'stamina',
  },
];

export class Tutorial {
  constructor() {
    this.active = false;
    this.currentStep = 0;
    this._skipBtn = new Button(0, 0, 60, 30, '跳过', 'rgba(255,255,255,0.5)');
    this._skipBtn.onClick = () => this._finish();
    this._nextBtn = new Button(0, 0, 80, 32, '下一步', '#4a90d9');
    this._nextBtn.onClick = () => this._next();
    this._doneBtn = new Button(0, 0, 100, 36, '开始游戏', '#4caf50');
    this._doneBtn.onClick = () => this._finish();
  }

  start() {
    this.active = true;
    this.currentStep = 0;
  }

  _next() {
    this.currentStep++;
    if (this.currentStep >= STEPS.length) {
      this._finish();
    }
  }

  _finish() {
    this.active = false;
    GameGlobal.databus.tutorialDone = true;
    try { wx.setStorageSync('tutorial_done', true); } catch (e) {}
  }

  onTouch(x, y) {
    if (!this.active) return;
    const db = GameGlobal.databus;

    if (this.currentStep === 2 && db.usedFragments.length > 0) {
      this._next();
      return;
    }

    if (this.currentStep < STEPS.length - 1) {
      this._skipBtn.x = SCREEN_WIDTH - 70;
      this._skipBtn.y = 14;
      if (this._skipBtn.hitTest(x, y)) { this._skipBtn.onClick(); return; }

      this._nextBtn.x = SCREEN_WIDTH / 2 - 40;
      this._nextBtn.y = SCREEN_HEIGHT - 60;
      if (this._nextBtn.hitTest(x, y)) { this._nextBtn.onClick(); return; }
    } else {
      this._doneBtn.x = SCREEN_WIDTH / 2 - 50;
      this._doneBtn.y = SCREEN_HEIGHT - 60;
      if (this._doneBtn.hitTest(x, y)) { this._doneBtn.onClick(); return; }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const step = STEPS[this.currentStep];
    if (!step) return;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const rect = this._getHighlightRect(step.highlight);
    if (rect) {
      ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255,152,0,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
    }

    if (rect) {
      this._drawArrow(ctx, rect);
    }

    const textW = 260, textH = 70;
    const textX = (SCREEN_WIDTH - textW) / 2;
    // Position text below the highlight, or above if it would overflow
    let textY;
    if (rect) {
      const belowY = rect.y + rect.h + 20;
      textY = belowY + textH > SCREEN_HEIGHT - 20
        ? rect.y - textH - 20
        : belowY;
    } else {
      textY = SCREEN_HEIGHT / 2;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this._roundRect(ctx, textX, textY, textW, textH, 10);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const lines = step.text.split('\n');
    let lineY = textY + 26;
    for (const line of lines) {
      ctx.fillText(line, textX + textW / 2, lineY);
      lineY += 22;
    }

    if (this.currentStep < STEPS.length - 1) {
      this._skipBtn.x = SCREEN_WIDTH - 70;
      this._skipBtn.y = 14;
      this._skipBtn.draw(ctx);
      this._nextBtn.x = SCREEN_WIDTH / 2 - 40;
      this._nextBtn.y = SCREEN_HEIGHT - 60;
      this._nextBtn.draw(ctx);
    } else {
      this._doneBtn.x = SCREEN_WIDTH / 2 - 50;
      this._doneBtn.y = SCREEN_HEIGHT - 60;
      this._doneBtn.draw(ctx);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((this.currentStep + 1) + ' / ' + STEPS.length, SCREEN_WIDTH / 2, SCREEN_HEIGHT - 76);
  }

  _getHighlightRect(highlight) {
    const main = GameGlobal.main;
    if (!main) return null;
    const sy = main.gameScrollY || 0;

    switch (highlight) {
      case 'grid': {
        const grid = main.grid;
        grid.getLayout();
        const panelPad = 16;
        return {
          x: grid.offsetX - panelPad,
          y: grid.offsetY - panelPad - sy,
          w: GameGlobal.databus.cols * grid.cellSize + (GameGlobal.databus.cols - 1) * grid.gap + panelPad * 2,
          h: GameGlobal.databus.rows * grid.cellSize + (GameGlobal.databus.rows - 1) * grid.gap + panelPad * 2,
        };
      }
      case 'fragments': {
        const bar = main.fragmentBar;
        bar.getLayout();
        return {
          x: 0,
          y: bar.startY - 8 - sy,
          w: SCREEN_WIDTH,
          h: bar.totalHeight + 16,
        };
      }
      case 'demo':
        return { x: 40, y: SCREEN_HEIGHT * 0.45, w: SCREEN_WIDTH - 80, h: SCREEN_HEIGHT * 0.35 };
      case 'buttons': {
        const hud = main.hud;
        hud.getLayout();
        return {
          x: 0,
          y: hud.yBottom - 8,
          w: SCREEN_WIDTH,
          h: SCREEN_HEIGHT - hud.yBottom + 8,
        };
      }
      case 'stamina': {
        const hud = main.hud;
        return { x: 4, y: hud.headerH + 2 - sy, w: SCREEN_WIDTH - 8, h: hud.statusH };
      }
      default:
        return null;
    }
  }

  _drawArrow(ctx, rect) {
    const arrowX = rect.x + rect.w / 2;
    const arrowY = rect.y - 10;
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - 8, arrowY - 16);
    ctx.lineTo(arrowX + 8, arrowY - 16);
    ctx.closePath();
    ctx.fill();
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
}
