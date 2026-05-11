import { SCREEN_WIDTH } from '../render';
import { PlaceState, ScreenState } from '../databus';
import { api } from '../api/index';

export class Grid {
  constructor() {
    this.cellSize = 54;
    this.gap = 5;
    this.offsetX = 0;
    this.offsetY = 0;
    this.highlightCell = null;
  }

  getLayout() {
    const db = GameGlobal.databus;
    const hud = GameGlobal.main && GameGlobal.main.hud;
    const headerH = hud ? hud.headerH : 50;
    const statusH = hud ? hud.statusH : 72;
    const panelPad = 16;
    const marginTop = 10;
    const maxGridW = SCREEN_WIDTH - panelPad * 2;
    // Shrink cell size if grid is too wide
    const idealCellW = (maxGridW - (db.cols - 1) * this.gap) / db.cols;
    this.cellSize = Math.min(54, Math.floor(idealCellW));
    const totalW = db.cols * this.cellSize + (db.cols - 1) * this.gap;
    const totalH = db.rows * this.cellSize + (db.rows - 1) * this.gap;
    this.offsetX = (SCREEN_WIDTH - totalW) / 2;
    // Grid sits below header + status area + margin + panel padding
    this.offsetY = headerH + statusH + marginTop + panelPad;
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
    if (db.previewMode) { db.showToast('预览模式，无法操作'); return; }
    const cell = this.getCellAt(x, y);
    if (!cell) return;

    const char = db.gridState[cell.row] && db.gridState[cell.row][cell.col];
    if (char) return;

    if (!db.selectedFragment && db.placeState === PlaceState.IDLE) {
      db.firstCell = cell;
      this.highlightCell = cell;
      return;
    }

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
        GameGlobal.main.soundManager.playSfx('place_ok');
        db.gridState = res.gridState;
        db.fragments = res.fragments
          ? res.fragments.map((f, i) => ({
              ...f,
              uid: f.uid || (f.text + '_' + (f.positions ? JSON.stringify(f.positions) : i)),
            }))
          : db.fragments.filter(f => f.uid !== frag.uid);
        if (!db.usedFragments.includes(frag.uid)) {
          db.usedFragments.push(frag.uid);
        }
        db.stamina = res.stamina;
        db.totalScore = res.totalScore;
        db.reset();
        this.highlightCell = null;
        if (res.isComplete) {
          GameGlobal.main.soundManager.playSfx('complete');
          db.currentLevel = Math.max(db.currentLevel, db.levelId + 1);
          const scoreDelta = res.scoreDelta || 0;
          const buttons = [];

          if (scoreDelta > 0) {
            buttons.push({
              label: '翻倍积分',
              color: '#ff9800',
              onClick: () => {
                GameGlobal.main.adManager.showRewarded('double_score', () => {
                  api.doubleScore(scoreDelta).then(r => {
                    db.totalScore = r.totalScore;
                    GameGlobal.main.dialog.hide();
                    GameGlobal.main.dialog.showIdioms('积分翻倍！', res.idioms || [], scoreDelta, [
                      { label: '下一关', color: '#4a90d9', onClick: () => { GameGlobal.main.dialog.hide(); GameGlobal.main.menu.startLevel(db.levelId + 1); } },
                      { label: '返回', color: '#999', onClick: () => { GameGlobal.main.dialog.hide(); db.screen = ScreenState.MENU; GameGlobal.main.menu.loadLevels(); } }
                    ]);
                  });
                });
              }
            });
          }

          buttons.push(
            {
              label: '下一关',
              color: '#4a90d9',
              onClick: () => {
                GameGlobal.main.dialog.hide();
                GameGlobal.main.menu.startLevel(db.levelId + 1);
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
          );

          GameGlobal.main.dialog.showIdioms('恭喜通关！', res.idioms || [], scoreDelta, buttons);
        }
      })
      .catch(err => {
        GameGlobal.main.soundManager.playSfx('place_fail');
        db.stamina = err.stamina !== undefined ? err.stamina : db.stamina;
        db.showToast(err.message || '位置不对');
        db.reset();
        this.highlightCell = null;
      });
  }

  draw(ctx) {
    const db = GameGlobal.databus;
    this.getLayout();

    // Grid panel background
    const panelPad = 16;
    const panelX = this.offsetX - panelPad;
    const panelY = this.offsetY - panelPad;
    const panelW = db.cols * this.cellSize + (db.cols - 1) * this.gap + panelPad * 2;
    const panelH = db.rows * this.cellSize + (db.rows - 1) * this.gap + panelPad * 2;

    // Panel shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    this._roundRect(ctx, panelX + 2, panelY + 3, panelW, panelH, 12);
    ctx.fill();

    // Panel background
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this._roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    for (let r = 0; r < db.rows; r++) {
      for (let c = 0; c < db.cols; c++) {
        const cx = this.offsetX + c * (this.cellSize + this.gap);
        const cy = this.offsetY + r * (this.cellSize + this.gap);
        const char = db.gridState[r] && db.gridState[r][c];
        const isHighlighted = this.highlightCell && this.highlightCell.row === r && this.highlightCell.col === c;

        // Cell shadow
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        this._roundRect(ctx, cx + 1, cy + 2, this.cellSize, this.cellSize, 8);
        ctx.fill();

        // Cell background
        if (char) {
          const grad = ctx.createLinearGradient(cx, cy, cx, cy + this.cellSize);
          grad.addColorStop(0, '#c8e6c9');
          grad.addColorStop(1, '#a5d6a7');
          ctx.fillStyle = grad;
        } else if (isHighlighted) {
          ctx.fillStyle = '#fff3e0';
        } else {
          ctx.fillStyle = '#ffffff';
        }
        this._roundRect(ctx, cx, cy, this.cellSize, this.cellSize, 8);
        ctx.fill();

        // Cell border
        ctx.strokeStyle = isHighlighted ? '#ff9800' : '#d0d0d0';
        ctx.lineWidth = isHighlighted ? 2.5 : 1;
        this._roundRect(ctx, cx, cy, this.cellSize, this.cellSize, 8);
        ctx.stroke();

        // Highlight glow
        if (isHighlighted) {
          ctx.strokeStyle = 'rgba(255,152,0,0.25)';
          ctx.lineWidth = 6;
          this._roundRect(ctx, cx - 3, cy - 3, this.cellSize + 6, this.cellSize + 6, 11);
          ctx.stroke();
        }

        // Character text
        if (char) {
          ctx.fillStyle = '#2e7d32';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(char, cx + this.cellSize / 2, cy + this.cellSize / 2 + 1);
        }
      }
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
}
