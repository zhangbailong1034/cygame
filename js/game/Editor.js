import { SCREEN_WIDTH } from '../render';
import { ScreenState } from '../databus';
import { api } from '../api/index';
import { Button } from '../ui/Button';

export class Editor {
  constructor() {
    this.rows = 5;
    this.cols = 5;
    this.cellSize = 40;
    this.gap = 3;
    this.fixedCells = [];
    this.idioms = [];

    this.doneBtn = new Button(SCREEN_WIDTH - 70, 8, 60, 32, '保存', '#4a90d9');
    this.doneBtn.onClick = () => this.save();
    this.backBtn = new Button(8, 8, 50, 32, '返回', '#999');
    this.backBtn.onClick = () => {
      GameGlobal.databus.screen = ScreenState.MENU;
    };
  }

  getOffset() {
    const totalW = this.cols * this.cellSize + (this.cols - 1) * this.gap;
    return {
      x: (SCREEN_WIDTH - totalW) / 2,
      y: 70,
    };
  }

  getCell(px, py) {
    const off = this.getOffset();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cx = off.x + c * (this.cellSize + this.gap);
        const cy = off.y + r * (this.cellSize + this.gap);
        if (px >= cx && px <= cx + this.cellSize &&
            py >= cy && py <= cy + this.cellSize) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  onTouch(x, y) {
    if (this.backBtn.hitTest(x, y)) { this.backBtn.onClick(); return; }
    if (this.doneBtn.hitTest(x, y)) { this.doneBtn.onClick(); return; }

    const cell = this.getCell(x, y);
    if (!cell) return;

    const exist = this.fixedCells.findIndex(f => f.row === cell.row && f.col === cell.col);
    if (exist >= 0) {
      this.fixedCells.splice(exist, 1);
    } else {
      this.fixedCells.push({ row: cell.row, col: cell.col, char: '字' });
    }
  }

  save() {
    const fragments = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const isFixed = this.fixedCells.some(f => f.row === r && f.col === c);
        if (!isFixed) {
          fragments.push({ text: '?', length: 1, positions: [[r, c]] });
        }
      }
    }
    const data = {
      levelId: Date.now() % 10000,
      rows: this.rows,
      cols: this.cols,
      fixedCells: this.fixedCells,
      idioms: this.idioms,
      fragments,
      distractors: [],
      difficulty: 'easy',
      minScore: 50,
    };
    api.saveLevel(data).then(() => {
      GameGlobal.databus.showToast('关卡保存成功');
    }).catch(() => GameGlobal.databus.showToast('保存失败'));
  }

  draw(ctx) {
    const off = this.getOffset();

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SCREEN_WIDTH, 48);
    this.backBtn.draw(ctx);
    this.doneBtn.draw(ctx);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('关卡编辑器', SCREEN_WIDTH / 2, 26);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cx = off.x + c * (this.cellSize + this.gap);
        const cy = off.y + r * (this.cellSize + this.gap);

        const isFixed = this.fixedCells.some(f => f.row === r && f.col === c);
        ctx.fillStyle = isFixed ? '#d4e8d4' : '#ffffff';
        ctx.strokeStyle = '#b0b0b0';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, this.cellSize, this.cellSize);
        ctx.fillRect(cx, cy, this.cellSize, this.cellSize);
        ctx.strokeRect(cx, cy, this.cellSize, this.cellSize);

        if (isFixed) {
          const fc = this.fixedCells.find(f => f.row === r && f.col === c);
          ctx.fillStyle = '#333';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fc.char, cx + this.cellSize / 2, cy + this.cellSize / 2);
        }
      }
    }

    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击格子设置/取消固定字', SCREEN_WIDTH / 2,
      off.y + this.rows * (this.cellSize + this.gap) + 20);
  }
}
