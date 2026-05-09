import { SCREEN_WIDTH } from '../render';
import { PlaceState } from '../databus';

export class FragmentBar {
  constructor() {
    this.y = 0;
    this.itemW = 56;
    this.itemH = 40;
    this.gap = 8;
    this.paddingX = 12;
  }

  getLayout() {
    const gridBottom = 70 + 6 * (52 + 4);
    this.y = Math.max(gridBottom + 10, SCREEN_WIDTH * 0.95);
  }

  hitTest(px, py) {
    this.getLayout();
    const db = GameGlobal.databus;
    const allItems = [
      ...db.fragments,
      ...db.distractors.map(d => ({ text: d.text, length: d.length, positions: null })),
    ];
    let cx = this.paddingX;
    for (const frag of allItems) {
      const w = frag.length === 2 ? this.itemW * 2 + this.gap : this.itemW;
      if (px >= cx && px <= cx + w && py >= this.y && py <= this.y + this.itemH) {
        return true;
      }
      cx += w + this.gap;
    }
    return false;
  }

  getFragmentAt(px, py) {
    const db = GameGlobal.databus;
    const allItems = [
      ...db.fragments,
      ...db.distractors.map(d => ({ text: d.text, length: d.length, positions: null })),
    ];
    let cx = this.paddingX;
    for (const frag of allItems) {
      const w = frag.length === 2 ? this.itemW * 2 + this.gap : this.itemW;
      if (px >= cx && px <= cx + w && py >= this.y && py <= this.y + this.itemH) {
        return frag;
      }
      cx += w + this.gap;
    }
    return null;
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
    this.getLayout();
    const db = GameGlobal.databus;
    const allItems = [
      ...db.fragments.map(f => ({ ...f, isDistractor: false, used: false })),
      ...db.distractors.map(d => ({ text: d.text, length: d.length, positions: null, isDistractor: true, used: false })),
    ];

    let cx = this.paddingX;

    for (const frag of allItems) {
      const w = frag.length === 2 ? this.itemW * 2 + this.gap : this.itemW;

      if (cx + w > SCREEN_WIDTH - this.paddingX) break;

      const isSelected = db.selectedFragment && db.selectedFragment.text === frag.text;

      if (frag.isDistractor) {
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
      ctx.moveTo(cx + r, this.y);
      ctx.lineTo(cx + w - r, this.y);
      ctx.quadraticCurveTo(cx + w, this.y, cx + w, this.y + r);
      ctx.lineTo(cx + w, this.y + this.itemH - r);
      ctx.quadraticCurveTo(cx + w, this.y + this.itemH, cx + w - r, this.y + this.itemH);
      ctx.lineTo(cx + r, this.y + this.itemH);
      ctx.quadraticCurveTo(cx, this.y + this.itemH, cx, this.y + this.itemH - r);
      ctx.lineTo(cx, this.y + r);
      ctx.quadraticCurveTo(cx, this.y, cx + r, this.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(frag.text, cx + w / 2, this.y + this.itemH / 2);

      cx += w + this.gap;
    }
  }
}
