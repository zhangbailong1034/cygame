import { SCREEN_WIDTH } from '../render';
import { PlaceState, ScreenState } from '../databus';
import { api } from '../api/index';

export class Grid {
  constructor() {
    this.cellSize = 52;
    this.gap = 4;
    this.offsetX = 0;
    this.offsetY = 0;
    this.highlightCell = null;
  }

  getLayout() {
    const db = GameGlobal.databus;
    const totalW = db.cols * this.cellSize + (db.cols - 1) * this.gap;
    const totalH = db.rows * this.cellSize + (db.rows - 1) * this.gap;
    this.offsetX = (SCREEN_WIDTH - totalW) / 2;
    this.offsetY = 70;
    return { totalW, totalH, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  hitTest(px, py) {
    const db = GameGlobal.databus;
    this.getLayout();
    for (let r = 0; r < db.rows; r++) {
      for (let c = 0; c < db.cols; c++) {
        const cx = this.offsetX + c * (this.cellSize + this.gap);
        const cy = this.offsetY + r * (this.cellSize + this.gap);
        if (px >= cx && px <= cx + this.cellSize &&
            py >= cy && py <= cy + this.cellSize) {
          return true;
        }
      }
    }
    return false;
  }

  getCellAt(px, py) {
    const db = GameGlobal.databus;
    this.getLayout();
    for (let r = 0; r < db.rows; r++) {
      for (let c = 0; c < db.cols; c++) {
        const cx = this.offsetX + c * (this.cellSize + this.gap);
        const cy = this.offsetY + r * (this.cellSize + this.gap);
        if (px >= cx && px <= cx + this.cellSize &&
            py >= cy && py <= cy + this.cellSize) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  onTouch(x, y) {
    const db = GameGlobal.databus;
    const cell = this.getCellAt(x, y);
    if (!cell) return;

    const char = db.gridState[cell.row] && db.gridState[cell.row][cell.col];
    if (char) return;

    // 未选中碎片：记录格子用于提示
    if (!db.selectedFragment && db.placeState === PlaceState.IDLE) {
      db.firstCell = cell;
      this.highlightCell = cell;
      return;
    }

    // 已选中碎片：尝试放置
    if (db.selectedFragment) {
      const frag = db.selectedFragment;

      if (frag.length === 1) {
        this.placeFragment(frag, [cell]);
      } else if (frag.length === 2) {
        if (db.placeState === PlaceState.IDLE) {
          db.firstCell = cell;
          db.placeState = PlaceState.SELECTING_CELLS;
          this.highlightCell = cell;
          db.showToast('请选择第二个连续的空格');
        } else {
          const first = db.firstCell;
          const isAdjacent = (
            (first.row === cell.row && Math.abs(first.col - cell.col) === 1) ||
            (first.col === cell.col && Math.abs(first.row - cell.row) === 1)
          );
          if (!isAdjacent) {
            db.showToast('请选择连续的两个格子（同行或同列）');
            db.reset();
            this.highlightCell = null;
            return;
          }
          const positions = [first, cell].sort((a, b) => a.row - b.row || a.col - b.col);
          this.placeFragment(frag, positions);
        }
      }
    }
  }

  placeFragment(frag, positions) {
    const db = GameGlobal.databus;
    api.placeFragment(db.levelId, frag.text, positions.map(p => [p.row, p.col]))
      .then(res => {
        db.gridState = res.gridState;
        db.fragments = res.fragments || db.fragments.filter(f => f.text !== frag.text);
        if (!db.usedFragments.includes(frag.text)) {
          db.usedFragments.push(frag.text);
        }
        db.stamina = res.stamina;
        db.totalScore = res.totalScore;
        db.reset();
        this.highlightCell = null;
        if (res.isComplete) {
          GameGlobal.main.dialog.show(
            '恭喜通关！',
            '获得 ' + res.scoreDelta + ' 积分，体力 +2',
            [
              {
                label: '下一关',
                color: '#4a90d9',
                onClick: () => {
                  GameGlobal.main.dialog.hide();
                  const nextLevel = db.levelId + 1;
                  GameGlobal.main.menu.startLevel(nextLevel);
                }
              },
              {
                label: '返回',
                color: '#999',
                onClick: () => {
                  GameGlobal.main.dialog.hide();
                  db.screen = ScreenState.MENU;
                  GameGlobal.main.menu.loadLevels();
                }
              }
            ]
          );
        }
      })
      .catch(err => {
        db.stamina = err.stamina !== undefined ? err.stamina : db.stamina;
        db.showToast(err.message || '位置不对');
        db.reset();
        this.highlightCell = null;
      });
  }

  draw(ctx) {
    const db = GameGlobal.databus;
    this.getLayout();

    for (let r = 0; r < db.rows; r++) {
      for (let c = 0; c < db.cols; c++) {
        const cx = this.offsetX + c * (this.cellSize + this.gap);
        const cy = this.offsetY + r * (this.cellSize + this.gap);
        const char = db.gridState[r] && db.gridState[r][c];

        if (char) {
          ctx.fillStyle = '#d4e8d4';
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.strokeStyle = '#b0b0b0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cr = 6;
        ctx.moveTo(cx + cr, cy);
        ctx.lineTo(cx + this.cellSize - cr, cy);
        ctx.quadraticCurveTo(cx + this.cellSize, cy, cx + this.cellSize, cy + cr);
        ctx.lineTo(cx + this.cellSize, cy + this.cellSize - cr);
        ctx.quadraticCurveTo(cx + this.cellSize, cy + this.cellSize, cx + this.cellSize - cr, cy + this.cellSize);
        ctx.lineTo(cx + cr, cy + this.cellSize);
        ctx.quadraticCurveTo(cx, cy + this.cellSize, cx, cy + this.cellSize - cr);
        ctx.lineTo(cx, cy + cr);
        ctx.quadraticCurveTo(cx, cy, cx + cr, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (this.highlightCell && this.highlightCell.row === r && this.highlightCell.col === c) {
          ctx.strokeStyle = '#ff6600';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx + cr, cy);
          ctx.lineTo(cx + this.cellSize - cr, cy);
          ctx.quadraticCurveTo(cx + this.cellSize, cy, cx + this.cellSize, cy + cr);
          ctx.lineTo(cx + this.cellSize, cy + this.cellSize - cr);
          ctx.quadraticCurveTo(cx + this.cellSize, cy + this.cellSize, cx + this.cellSize - cr, cy + this.cellSize);
          ctx.lineTo(cx + cr, cy + this.cellSize);
          ctx.quadraticCurveTo(cx, cy + this.cellSize, cx, cy + this.cellSize - cr);
          ctx.lineTo(cx, cy + cr);
          ctx.quadraticCurveTo(cx, cy, cx + cr, cy);
          ctx.closePath();
          ctx.stroke();
        }

        if (char) {
          ctx.fillStyle = '#333';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(char, cx + this.cellSize / 2, cy + this.cellSize / 2);
        }
      }
    }
  }
}
