import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { Button } from '../ui/Button';
import { api } from '../api/index';

const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const REWARD_DESC = [
  '体力+1', '体力+1', '体力+1\n积分+5', '体力+1',
  '体力+1\n提示+1', '体力+2', '体力+3\n积分+20\n提示+1',
];

export class DailySign {
  constructor() {
    this.visible = false;
    this.streak = 0;
    this.todaySigned = false;
    this.animTimer = 0;
    this.animParticles = [];

    this.signBtn = new Button(0, 0, 120, 40, '签到', '#e8a840');
    this.signBtn.onClick = () => this._doSign();
    this.closeBtn = new Button(0, 0, 80, 36, '关闭', '#999');
    this.closeBtn.onClick = () => this.hide();
  }

  show(streak, todaySigned) {
    this.visible = true;
    this.streak = streak || 0;
    this.todaySigned = todaySigned;
    this.animTimer = 0;
    this.animParticles = [];
    if (this.todaySigned) {
      this.signBtn.label = '已签到 ✓';
      this.signBtn.color = '#b0b0b0';
    } else {
      this.signBtn.label = '签到';
      this.signBtn.color = '#e8a840';
    }
  }

  hide() {
    this.visible = false;
  }

  async _doSign() {
    if (this.todaySigned) return;
    try {
      const res = await api.dailySign();
      const db = GameGlobal.databus;
      db.stamina = res.stamina;
      db.totalScore = res.totalScore;
      db.todaySigned = true;
      db.signStreak = res.reward.streak;
      this.todaySigned = true;
      this.signBtn.label = '已签到 ✓';
      this.signBtn.color = '#b0b0b0';
      this.streak = res.reward.streak;
      this._startAnim();
      GameGlobal.main.soundManager.playSfx('sign');
      db.showToast('签到成功！');
    } catch (e) {
      GameGlobal.databus.showToast(e.message || '签到失败');
    }
  }

  _startAnim() {
    this.animTimer = 60;
    this.animParticles = [];
    for (let i = 0; i < 12; i++) {
      this.animParticles.push({
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2 - 30,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        life: 30 + Math.random() * 30,
      });
    }
  }

  onTouch(x, y) {
    if (!this.visible) return;
    if (this.closeBtn.hitTest(x, y)) { this.closeBtn.onClick(); return; }
    if (this.signBtn.hitTest(x, y)) { this.signBtn.onClick(); return; }
  }

  draw(ctx) {
    if (!this.visible) return;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const panelW = 320, panelH = 280;
    const px = (SCREEN_WIDTH - panelW) / 2;
    const py = (SCREEN_HEIGHT - panelH) / 2;

    ctx.fillStyle = '#fff';
    this._roundRect(ctx, px, py, panelW, panelH, 14);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('每日签到', px + panelW / 2, py + 32);

    const barY = py + 56;
    const slotW = 32, slotH = 44, slotGap = 8;
    const totalW = 7 * slotW + 6 * slotGap;
    const startX = px + (panelW - totalW) / 2;

    for (let i = 0; i < 7; i++) {
      const sx = startX + i * (slotW + slotGap);
      const isToday = i === this.streak && !this.todaySigned;
      const isSigned = this.todaySigned ? (i < this.streak % 7 || this.streak >= 7) : (i < this.streak);

      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(DAY_LABELS[i], sx + slotW / 2, barY - 6);

      if (isSigned) {
        ctx.fillStyle = '#c8e6c9';
        ctx.strokeStyle = '#4caf50';
      } else if (isToday) {
        ctx.fillStyle = '#fff3e0';
        ctx.strokeStyle = '#e8a840';
      } else {
        ctx.fillStyle = '#f5f5f5';
        ctx.strokeStyle = '#ddd';
      }
      ctx.lineWidth = isToday ? 2.5 : 1;
      this._roundRect(ctx, sx, barY, slotW, slotH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSigned ? '#4caf50' : (isToday ? '#e8a840' : '#bbb');
      ctx.font = isSigned ? 'bold 18px sans-serif' : '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isSigned ? '✓' : (isToday ? '?' : '○'), sx + slotW / 2, barY + slotH / 2 + 6);
    }

    const descIdx = this.todaySigned ? (this.streak - 1) % 7 : this.streak % 7;
    const desc = REWARD_DESC[descIdx >= 0 ? descIdx : 0];
    ctx.fillStyle = '#e8a840';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    const lines = desc.split('\n');
    let descY = barY + slotH + 18;
    for (const line of lines) {
      ctx.fillText('今日奖励：' + line, px + panelW / 2, descY);
      descY += 18;
    }

    this.signBtn.x = px + panelW / 2 - 60;
    this.signBtn.y = py + panelH - 60;
    this.signBtn.draw(ctx);

    this.closeBtn.x = px + panelW - 90;
    this.closeBtn.y = py + 8;
    this.closeBtn.draw(ctx);

    if (this.animTimer > 0) {
      for (const p of this.animParticles) {
        if (p.life > 0) {
          ctx.fillStyle = 'rgba(232,168,64,' + (p.life / 30) + ')';
          ctx.font = '14px sans-serif';
          ctx.fillText('⭐', p.x, p.y);
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
        }
      }
      this.animTimer--;
      if (this.animTimer === 0) this.hide();
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
