export class Button {
  constructor(x, y, width, height, label, color = '#4a90d9') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.label = label;
    this.color = color;
    this.enabled = true;
    this.onClick = null;
  }

  draw(ctx) {
    const baseColor = this.enabled ? this.color : '#cccccc';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    this._roundRect(ctx, this.x + 1, this.y + 2, this.width, this.height, 8);
    ctx.fill();

    // Button body
    ctx.fillStyle = baseColor;
    this._roundRect(ctx, this.x, this.y, this.width, this.height, 8);
    ctx.fill();

    // Subtle top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    this._roundRect(ctx, this.x + 2, this.y + 1, this.width - 4, this.height / 2, 6);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2 + 1);
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

  hitTest(px, py) {
    return this.enabled &&
      px >= this.x && px <= this.x + this.width &&
      py >= this.y && py <= this.y + this.height;
  }
}
