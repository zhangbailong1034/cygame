import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

export class Toast {
  draw(ctx) {
    const db = GameGlobal.databus;
    if (!db.toastMessage) return;

    const w = 300, h = 44;
    const x = (SCREEN_WIDTH - w) / 2;
    const y = SCREEN_HEIGHT / 3;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    const r = 10;
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

    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(db.toastMessage, x + w / 2, y + h / 2);
  }
}
