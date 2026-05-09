import { SCREEN_WIDTH } from '../render';
import { PlaceState } from '../databus';

export class FragmentBar {
  constructor() {
    this.itemW = 56;
    this.itemH = 40;
    this.gap = 8;
    this.paddingX = 12;
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

    const gridBottom = 70 + db.rows * (52 + 4);
    this.startY = Math.max(gridBottom + 10, SCREEN_WIDTH * 0.92);
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
    const frag = this.getFragmentAt(x, y);
    if (!frag) { db.reset(); return; }

    if (frag.positions === null) {
      db.showToast('此碎片不属于任何位置');
      return;
    }

    if (db.selectedFragment && db.selectedFragment.text === frag.text) {
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

    for (const item of items) {
      const { x, y, w, h, text, isDistractor } = item;
      const isSelected = db.selectedFragment && db.selectedFragment.text === text;

      if (isDistractor) {
        ctx.fillStyle = '#f0e6d0';
      } else if (isSelected) {
        ctx.fillStyle = '#ffcc80';
      } else {
        ctx.fillStyle = '#e8f0e8';
      }

      ctx.strokeStyle = isSelected ? '#ff6600' : '#b0b0b0';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      const r = 6;
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
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x + w / 2, y + h / 2);
    }
  }
}
