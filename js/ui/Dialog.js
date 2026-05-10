import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { Button } from './Button';

export class Dialog {
  constructor() {
    this.visible = false;
    this.mode = 'simple'; // 'simple' | 'idioms' | 'saved' | 'leaderboard'
    this.title = '';
    this.message = '';
    this.buttons = [];
    this.idioms = [];
    this.expandedIdx = -1;
    this.scoreDelta = 0;
    // hit test rects
    this._learnBtns = [];  // { x, y, w, h, idx } for 学习 buttons
    this._actionRects = {}; // { save: {x,y,w,h}, share: {x,y,w,h} } for expanded card
    this._cardRects = [];  // { y, h, idx } for idiom card backgrounds
  }

  show(title, message, buttons) {
    this.visible = true;
    this.mode = 'simple';
    this.title = title;
    this.message = message;
    this.buttons = buttons.map((b) => {
      const btn = new Button(0, 0, 120, 40, b.label, b.color || '#4a90d9');
      btn.onClick = b.onClick;
      return btn;
    });
  }

  showIdioms(title, idioms, scoreDelta, buttons) {
    this.visible = true;
    this.mode = 'idioms';
    this.title = title;
    this.idioms = idioms || [];
    this.expandedIdx = -1;
    this.scoreDelta = scoreDelta;
    this.buttons = buttons.map((b) => {
      const btn = new Button(0, 0, 120, 36, b.label, b.color || '#4a90d9');
      btn.onClick = b.onClick;
      return btn;
    });
  }

  showSavedIdioms() {
    const db = GameGlobal.databus;
    this.visible = true;
    this.mode = 'saved';
    this.title = '我的学习记录';
    this.idioms = db.savedIdioms || [];
    this.expandedIdx = -1;
    this.scoreDelta = 0;
    this.buttons = [
      (() => {
        const btn = new Button(0, 0, 120, 36, '关闭', '#999');
        btn.onClick = () => this.hide();
        return btn;
      })(),
    ];
  }

  showLeaderboard(rankings) {
    const db = GameGlobal.databus;
    this.visible = true;
    this.mode = 'leaderboard';
    this.rankings = rankings || [];
    this.currentUserId = db.userId;
    this.buttons = [
      (() => {
        const btn = new Button(0, 0, 120, 36, '关闭', '#999');
        btn.onClick = () => this.hide();
        return btn;
      })(),
    ];
  }

  hide() {
    this.visible = false;
    this.expandedIdx = -1;
    this._learnBtns = [];
    this._actionRects = {};
    this._cardRects = [];
  }

  draw(ctx) {
    if (!this.visible) return;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    if (this.mode === 'simple') {
      this._drawSimple(ctx);
    } else if (this.mode === 'leaderboard') {
      this._drawLeaderboard(ctx);
    } else {
      this._drawIdioms(ctx);
    }
  }

  _drawSimple(ctx) {
    const w = 300, h = 180;
    const x = (SCREEN_WIDTH - w) / 2;
    const y = (SCREEN_HEIGHT - h) / 2;

    ctx.fillStyle = '#fff';
    this._roundRect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.title, x + w / 2, y + 35);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(this.message, x + w / 2, y + 75);

    this._drawButtons(ctx, x, y, w, h);
  }

  _drawIdioms(ctx) {
    const db = GameGlobal.databus;
    const isCompletion = this.mode === 'idioms';
    const idiomCount = this.idioms.length;
    const dialogW = 330;
    const headerH = isCompletion ? 56 : 40;
    const cardBaseH = 46;
    const expandedExtra = 90;
    let totalH = headerH + 60;

    this._cardRects = [];
    this._learnBtns = [];
    this._actionRects = {};
    let curY = headerH;

    for (let i = 0; i < idiomCount; i++) {
      const isExpanded = this.expandedIdx === i;
      const h = cardBaseH + (isExpanded ? expandedExtra : 0);
      this._cardRects.push({ idx: i, y: curY, h });
      curY += h + 6;
      totalH += h + 6;
    }
    totalH = Math.min(totalH, SCREEN_HEIGHT - 40);

    const x = (SCREEN_WIDTH - dialogW) / 2;
    const y = Math.max(10, (SCREEN_HEIGHT - totalH) / 2);

    // Dialog background
    ctx.fillStyle = '#fff';
    this._roundRect(ctx, x, y, dialogW, totalH, 14);
    ctx.fill();

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.title, x + dialogW / 2, y + 28);

    if (isCompletion) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#e8a840';
      ctx.fillText('获得 ' + this.scoreDelta + ' 积分，体力 +2', x + dialogW / 2, y + 48);
    }

    if (idiomCount === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.fillText('暂无记录', x + dialogW / 2, y + headerH + 30);
    }

    // Idiom cards
    for (let i = 0; i < idiomCount; i++) {
      const idiom = this.idioms[i];
      const isExpanded = this.expandedIdx === i;
      const rect = this._cardRects[i];
      const cardX = x + 14;
      const cardY = y + rect.y;
      const cardW = dialogW - 28;
      const cardH = rect.h;

      // Card background
      ctx.fillStyle = isExpanded ? '#f0f4ff' : '#f8f8f8';
      this._roundRect(ctx, cardX, cardY, cardW, cardH, 8);
      ctx.fill();

      // Idiom text: left-aligned
      ctx.fillStyle = '#333';
      ctx.font = 'bold 19px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(idiom.answer, cardX + 14, cardY + 30);

      if (!isExpanded) {
        // 学习 button on the right
        const learnW = 48, learnH = 28;
        const learnX = cardX + cardW - learnW - 12;
        const learnY = cardY + (cardBaseH - learnH) / 2;
        this._learnBtns.push({ x: learnX, y: learnY, w: learnW, h: learnH, idx: i });

        ctx.fillStyle = '#4a90d9';
        this._roundRect(ctx, learnX, learnY, learnW, learnH, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('学习', learnX + learnW / 2, learnY + learnH / 2 + 4);
      }

      if (isExpanded) {
        // Meaning text
        ctx.fillStyle = '#555';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'left';
        const meaning = idiom.meaning || '暂无释义';
        const maxW = cardW - 24;
        let line = '';
        let lineY = cardY + 54;
        for (const ch of meaning.split('')) {
          const test = line + ch;
          if (ctx.measureText(test).width > maxW && line.length > 0) {
            ctx.fillText(line, cardX + 14, lineY);
            line = ch;
            lineY += 18;
          } else {
            line = test;
          }
        }
        if (line) ctx.fillText(line, cardX + 14, lineY);

        // Save & Share buttons
        const btnW = 60, btnH = 28;
        const btnY = cardY + cardH - 36;
        const saveX = cardX + cardW / 2 - btnW - 14;
        const shareX = cardX + cardW / 2 + 14;

        const isSaved = db.savedIdioms.some(s => s.answer === idiom.answer);

        ctx.fillStyle = isSaved ? '#ccc' : '#e8a840';
        this._roundRect(ctx, saveX, btnY, btnW, btnH, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isSaved ? '已记录' : '记录', saveX + btnW / 2, btnY + btnH / 2 + 4);

        ctx.fillStyle = '#6c9bd2';
        this._roundRect(ctx, shareX, btnY, btnW, btnH, 5);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('分享', shareX + btnW / 2, btnY + btnH / 2 + 4);

        this._actionRects = {
          save: { x: saveX, y: btnY, w: btnW, h: btnH },
          share: { x: shareX, y: btnY, w: btnW, h: btnH },
        };
      }
    }

    // Bottom buttons
    ctx.textAlign = 'center';
    this._drawButtons(ctx, x, y, dialogW, totalH);
  }

  _drawLeaderboard(ctx) {
    const db = GameGlobal.databus;
    const rankings = this.rankings || [];
    const dialogW = 320;
    const headerH = 48;
    const rowH = 36;
    const rows = Math.min(rankings.length, 12);
    const totalH = headerH + rows * (rowH + 2) + 60;
    const x = (SCREEN_WIDTH - dialogW) / 2;
    const y = Math.max(20, (SCREEN_HEIGHT - totalH) / 2);

    // Dialog background
    ctx.fillStyle = '#fff';
    this._roundRect(ctx, x, y, dialogW, totalH, 14);
    ctx.fill();

    // Header with gradient effect
    const headerGrad = ctx.createLinearGradient(x, y, x, y + headerH);
    headerGrad.addColorStop(0, '#4a6fa5');
    headerGrad.addColorStop(1, '#3b5998');
    ctx.fillStyle = headerGrad;
    ctx.beginPath();
    ctx.moveTo(x + 14, y);
    ctx.lineTo(x + dialogW - 14, y);
    ctx.quadraticCurveTo(x + dialogW, y, x + dialogW, y + 14);
    ctx.lineTo(x + dialogW, y + headerH - 14);
    ctx.quadraticCurveTo(x + dialogW, y + headerH, x + dialogW - 14, y + headerH);
    ctx.lineTo(x + 14, y + headerH);
    ctx.quadraticCurveTo(x, y + headerH, x, y + headerH - 14);
    ctx.lineTo(x, y + 14);
    ctx.quadraticCurveTo(x, y, x + 14, y);
    ctx.closePath();
    ctx.fill();

    // Title and trophy icon
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('积分排行榜', x + dialogW / 2, y + 32);

    if (rankings.length === 0) {
      ctx.fillStyle = '#999';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无排行数据', x + dialogW / 2, y + headerH + 50);
    }

    // Rank colors
    const rankColors = ['#f5a623', '#9b9b9b', '#cd7f32']; // gold, silver, bronze
    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < rows; i++) {
      const r = rankings[i];
      const rowY = y + headerH + 6 + i * (rowH + 2);
      const isMe = r.openId === this.currentUserId;
      const rank = r.rank || (i + 1);

      // Row background
      if (isMe) {
        ctx.fillStyle = 'rgba(74, 144, 217, 0.12)';
        ctx.fillRect(x + 8, rowY - 1, dialogW - 16, rowH + 2);
        ctx.fillStyle = '#4a90d9';
        ctx.fillRect(x + 8, rowY - 1, 3, rowH + 2);
      } else if (i % 2 === 0) {
        ctx.fillStyle = '#f9f9f9';
        ctx.fillRect(x + 10, rowY - 1, dialogW - 20, rowH + 2);
      }

      // Rank badge / medal
      const badgeX = x + 26, badgeY = rowY + rowH / 2;
      if (rank <= 3) {
        // Medal emoji for top 3
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(medals[rank - 1], badgeX, badgeY + 6);
      } else {
        // Colored rank number for 4+
        ctx.fillStyle = rank === 4 ? '#6c9bd2' : rank === 5 ? '#8cb86c' : '#aaa';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rank, badgeX, badgeY + 5);
      }

      const nickName = (r.nickName || '玩家' + (r.openId || '').slice(-4));

      // Nickname
      ctx.fillStyle = isMe ? '#4a90d9' : '#333';
      ctx.font = (isMe ? 'bold ' : '') + '14px sans-serif';
      ctx.textAlign = 'left';
      const nameX = x + 50;
      const maxNameW = 110;
      let displayName = nickName;
      if (ctx.measureText(nickName).width > maxNameW) {
        while (displayName.length > 0 && ctx.measureText(displayName + '...').width > maxNameW) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }
      ctx.fillText(displayName, nameX, rowY + rowH / 2 + 5);

      // Score with star
      ctx.fillStyle = '#e8a840';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('⭐ ' + r.totalScore, x + dialogW - 18, rowY + rowH / 2 + 5);
    }

    // Current user summary at bottom if not in list
    // (skip for now - user is highlighted in the list)

    // Bottom buttons
    this._drawButtons(ctx, x, y, dialogW, totalH);
  }

  _drawButtons(ctx, dialogX, dialogY, dialogW, dialogH) {
    const btnY = dialogY + dialogH - 50;
    const totalW = this.buttons.length * 130 - 10;
    let startX = dialogX + (dialogW - totalW) / 2;
    for (const btn of this.buttons) {
      btn.x = startX;
      btn.y = btnY;
      btn.draw(ctx);
      startX += 130;
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

  hitTest(x, y) {
    if (!this.visible) return null;

    // Bottom buttons
    for (const btn of this.buttons) {
      if (btn.hitTest(x, y)) return btn;
    }

    if (this.mode === 'leaderboard') {
      return null; // only buttons are clickable, handled above
    }

    if (this.mode === 'idioms' || this.mode === 'saved') {
      const dialogW = 330;
      const dialogX = (SCREEN_WIDTH - dialogW) / 2;
      const cardX = dialogX + 14;
      const cardW = dialogW - 28;

      // Recalculate dialog Y (same as _drawIdioms)
      const idiomCount = this.idioms.length;
      const headerH = this.mode === 'idioms' ? 56 : 40;
      let totalH = headerH + 60;
      for (let i = 0; i < idiomCount; i++) {
        const h = this.expandedIdx === i ? 46 + 90 : 46;
        totalH += h + 6;
      }
      totalH = Math.min(totalH, SCREEN_HEIGHT - 40);
      const dialogY = Math.max(10, (SCREEN_HEIGHT - totalH) / 2);

      // Check 学习 buttons first (unexpanded cards)
      for (const lb of this._learnBtns) {
        if (x >= lb.x && x <= lb.x + lb.w && y >= lb.y && y <= lb.y + lb.h) {
          return { type: 'learn', idx: lb.idx };
        }
      }

      // Check save/share in expanded card
      if (this.expandedIdx >= 0 && this._actionRects.save) {
        const sb = this._actionRects.save;
        if (x >= sb.x && x <= sb.x + sb.w && y >= sb.y && y <= sb.y + sb.h) {
          return { type: 'save' };
        }
        const shb = this._actionRects.share;
        if (x >= shb.x && x <= shb.x + shb.w && y >= shb.y && y <= shb.y + shb.h) {
          return { type: 'share' };
        }
      }

      // Check idiom card body (toggle expand)
      for (const rect of this._cardRects) {
        const cardY = dialogY + rect.y;
        if (x >= cardX && x <= cardX + cardW && y >= cardY && y <= cardY + rect.h) {
          return { type: 'idiom', idx: rect.idx };
        }
      }
    }

    return null;
  }
}
