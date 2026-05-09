import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { Button } from './Button';

export class Dialog {
  constructor() {
    this.visible = false;
    this.title = '';
    this.message = '';
    this.buttons = [];
  }

  show(title, message, buttons) {
    this.visible = true;
    this.title = title;
    this.message = message;
    this.buttons = buttons.map((b) => {
      const btn = new Button(0, 0, 120, 40, b.label, b.color || '#4a90d9');
      btn.onClick = b.onClick;
      return btn;
    });
  }

  hide() {
    this.visible = false;
  }

  draw(ctx) {
    if (!this.visible) return;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const w = 300, h = 180;
    const x = (SCREEN_WIDTH - w) / 2;
    const y = (SCREEN_HEIGHT - h) / 2;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    const r = 12;
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

    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.title, x + w / 2, y + 35);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(this.message, x + w / 2, y + 75);

    const btnY = y + h - 55;
    const totalW = this.buttons.length * 130 - 10;
    let startX = x + (w - totalW) / 2;
    for (const btn of this.buttons) {
      btn.x = startX;
      btn.y = btnY;
      btn.draw(ctx);
      startX += 130;
    }
  }

  hitTest(x, y) {
    if (!this.visible) return null;
    for (const btn of this.buttons) {
      if (btn.hitTest(x, y)) return btn;
    }
    return null;
  }
}
