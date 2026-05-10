import { SCREEN_WIDTH } from '../render';
import { PlaceState } from '../databus';

export class FragmentBar {
  constructor() {
    this.itemW = 56;
    this.itemH = 42;
    this.gap = 10;
    this.paddingX = 14;
    this.rowGap = 8;
    this.startY = 0;
    this._items = [];
  }

  getLayout() {
    const db = GameGlobal.databus;
    const allItems = [
      ...db.fragments.map(f => ({ ...f, isDistractor: false })),
      ...db.distractors.map(d => ({ text: d.text, length: d.length, positions: null, isDistractor: true })),
    ];

    // Match Grid's dynamic cell size calculation
    const panelPad = 16;
    const maxGridW = SCREEN_WIDTH - panelPad * 2;
    const gap = 5;
    const cellSize = Math.min(54, Math.floor((maxGridW - (db.cols - 1) * gap) / db.cols));
    const gridH = db.rows * cellSize + (db.rows - 1) * gap;
    const gridBottom = 138 + 16 + gridH;
    this.startY = Math.max(gridBottom + 14, SCREEN_WIDTH * 0.88);
    const maxW = SCREEN_WIDTH - this.paddingX * 2;

    this._items = [];
    let row = 0;
    let cx = this.paddingX;

    for (const frag of allItems) {
      const w = frag.length === 2 ? this.itemW * 2 + this.gap : this.itemW;
      if (cx + w > maxW && cx > this.paddingX) {
        row++;
        cx = this.paddingX;
      }
      this._items.push({
        ...frag,
        x: cx,
        y: this.startY + row * (this.itemH + this.rowGap),
        w,
        h: this.itemH,
      });
      cx += w + this.gap;
    }

    this.totalHeight = (row + 1) * (this.itemH + this.rowGap);
    return this._items;
  }

  hitTest(px, py) {
    this.getLayout();
    return this._items.some(item =>
      px >= item.x && px <= item.x + item.w &&
      py >= item.y && py <= item.y + item.h
    );
  }

  getFragmentAt(px, py) {
    this.getLayout();
    return this._items.find(item =>
      px >= item.x && px <= item.x + item.w &&
      py >= item.y && py <= item.y + item.h
    );
  }

  onTouch(x, y) {
    const db = GameGlobal.databus;
    if (db.previewMode) { db.showToast('预览模式，无法操作'); return; }
    const frag = this.getFragmentAt(x, y);
    if (!frag) { db.reset(); return; }

    if (frag.positions === null) {
      db.showToast('此碎片不属于任何位置');
      return;
    }

    if (db.firstCell && !db.selectedFragment && frag.length === 1) {
      GameGlobal.main.grid.placeFragment(frag, [db.firstCell]);
      return;
    }

    if (db.selectedFragment && db.selectedFragment.uid === frag.uid) {
      db.reset();
    } else {
      db.selectedFragment = frag;
      db.placeState = PlaceState.IDLE;
      db.firstCell = null;
      if (frag.length === 2) {
        db.showToast('请连续点击两个空格放置碎片');
      }
    }
  }

  draw(ctx) {
    const items = this.getLayout();
    const db = GameGlobal.databus;

    // Fragment area background
    const barTop = this.startY - 8;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, barTop, SCREEN_WIDTH, this.totalHeight + 16);
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, barTop, SCREEN_WIDTH, 1);

    for (const item of items) {
      const { x, y, w, h, text, isDistractor } = item;
      const isSelected = db.selectedFragment && db.selectedFragment.uid === item.uid;

      // Card shadow
      ctx.fillStyle = isSelected ? 'rgba(255,152,0,0.25)' : 'rgba(0,0,0,0.06)';
      this._roundRect(ctx, x + 1, y + 2, w, h, 8);
      ctx.fill();

      // Card background
      if (isDistractor) {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, '#f5efe0');
        grad.addColorStop(1, '#ede0c8');
        ctx.fillStyle = grad;
      } else if (isSelected) {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, '#fff3e0');
        grad.addColorStop(1, '#ffe0b2');
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, '#f0f4f0');
        grad.addColorStop(1, '#e2ece2');
        ctx.fillStyle = grad;
      }
      this._roundRect(ctx, x, y, w, h, 8);
      ctx.fill();

      // Card border
      ctx.strokeStyle = isSelected ? '#ff9800' : (isDistractor ? '#d8c8a8' : '#c0c8c0');
      ctx.lineWidth = isSelected ? 2 : 1;
      this._roundRect(ctx, x, y, w, h, 8);
      ctx.stroke();

      // Text
      ctx.fillStyle = isDistractor ? '#8a7a6a' : '#333';
      ctx.font = 'bold 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + w / 2, y + h / 2 + 1);
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
