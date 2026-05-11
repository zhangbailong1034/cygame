import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { ScreenState } from '../databus';
import { api } from '../api/index';
import { Button } from '../ui/Button';

export class MenuScreen {
  constructor() {
    this.levelBtns = [];
    this.startY = 120;
    this.editorTapCount = 0;
    this.editorTapTimer = 0;
    this.page = 0;
    this.perPage = 18;
    this.pageBtnH = 36;
    this.muteBtn = new Button(SCREEN_WIDTH - 46, 8, 38, 28, '🔊', 'rgba(0,0,0,0.15)');
    this.muteBtn.onClick = () => {
      GameGlobal.main.soundManager.toggleMute();
      this.muteBtn.label = GameGlobal.main.soundManager.muted ? '🔇' : '🔊';
    };

    // Scroll state
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.contentHeight = 0;
    this._dragStartY = 0;
    this._dragStartScrollY = 0;
    this._dragging = false;
    this._wasDrag = false;
    this._velocity = 0;
    this._lastTouchY = 0;
    this._lastTouchTime = 0;
    this._inertiaId = 0;
  }

  async loadLevels() {
    try {
      const [levelData, userData] = await Promise.all([api.getLevels(), api.getMe()]);
      const db = GameGlobal.databus;
      db.levels = levelData.levels;
      db.stamina = userData.user.stamina;
      db.totalScore = userData.user.total_score;
      db.currentLevel = userData.user.current_level;
      db.todaySigned = userData.user.todaySigned;
      db.signStreak = userData.user.signStreak;
      this.scrollY = 0;
      this.buildButtons();
      GameGlobal.main.adManager.showBanner();
      if (!db.todaySigned) {
        GameGlobal.main.dailySign.show(db.signStreak, false);
      }
    } catch (e) {
      GameGlobal.databus.showToast('加载关卡失败');
    }
  }

  buildButtons() {
    const db = GameGlobal.databus;
    this.levelBtns = [];
    this.totalPages = Math.ceil(db.levels.length / this.perPage);
    if (this.page >= this.totalPages) this.page = 0;

    const cols = 3;
    const btnW = 80, btnH = 50, gap = 12;
    const totalW = cols * btnW + (cols - 1) * gap;
    const startX = (SCREEN_WIDTH - totalW) / 2;
    const rowsPerPage = Math.ceil(this.perPage / cols);

    const start = this.page * this.perPage;
    const end = Math.min(start + this.perPage, db.levels.length);
    const pageLevels = db.levels.slice(start, end);

    pageLevels.forEach((lvl, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gap);
      const y = this.startY + row * (btnH + gap);
      const unlocked = lvl.level_id <= db.currentLevel;
      const color = lvl.level_id === db.currentLevel ? '#e8a840' : (unlocked ? '#4a90d9' : '#b0b0b0');
      const btn = new Button(x, y, btnW, btnH, '第' + lvl.level_id + '关', color);
      btn.enabled = true;
      btn.onClick = () => this.startLevel(lvl.level_id, !unlocked);
      this.levelBtns.push(btn);
    });

    // Page navigation
    this.prevBtn = null;
    this.nextBtn = null;
    const pageNavY = this.startY + rowsPerPage * (btnH + gap) + 8;
    const pageNavW = 72;

    if (this.page > 0) {
      this.prevBtn = new Button(SCREEN_WIDTH / 2 - pageNavW - 6, pageNavY, pageNavW, this.pageBtnH, '← 上一页', '#8a8a8a');
      this.prevBtn.onClick = () => { this.page--; this.scrollY = 0; this.buildButtons(); };
    }
    if (this.page < this.totalPages - 1) {
      this.nextBtn = new Button(SCREEN_WIDTH / 2 + 6, pageNavY, pageNavW, this.pageBtnH, '下一页 →', '#8a8a8a');
      this.nextBtn.onClick = () => { this.page++; this.scrollY = 0; this.buildButtons(); };
    }

    // Page indicator below buttons
    this.pageLabelY = pageNavY + this.pageBtnH + 14;

    const bottomY = this.pageLabelY + 14;
    this.rankBtn = new Button(SCREEN_WIDTH / 2 - 106, bottomY, 100, 40, '排行榜', '#e8a840');
    this.rankBtn.onClick = () => this.showRanking();

    this.studyBtn = new Button(SCREEN_WIDTH / 2 + 6, bottomY, 100, 40, '学习记录', '#6c9bd2');
    this.studyBtn.onClick = () => this.showStudyRecords();

    const adY = bottomY + 52;
    this.staminaAdBtn = new Button(SCREEN_WIDTH / 2 - 106, adY, 212, 36, '看广告 +3体力', '#ff9800');
    this.staminaAdBtn.onClick = () => {
      GameGlobal.main.adManager.showRewarded('stamina');
    };

    // Calculate total content height for scroll
    this.contentHeight = adY + 36 + 20; // last button bottom + padding
    this.maxScrollY = Math.max(0, this.contentHeight - SCREEN_HEIGHT);
    this.scrollY = Math.min(this.scrollY, this.maxScrollY);
  }

  startLevel(levelId, preview = false) {
    const db = GameGlobal.databus;
    db.levelId = levelId;
    api.getLevelData(levelId).then(data => {
      db.rows = data.rows;
      db.cols = data.cols;
      db.gridState = data.gridState;
      db.fragments = data.fragments.map((f, i) => ({
        ...f,
        uid: f.uid || (f.text + '_' + (f.positions ? JSON.stringify(f.positions) : i)),
      }));
      db.distractors = data.distractors.map((d, i) => ({
        ...d,
        uid: d.uid || ('dist_' + d.text + '_' + i),
      }));
      db.stamina = data.stamina;
      db.totalScore = data.totalScore;
      db.previewMode = preview;
      db.reset();
      db.screen = ScreenState.PLAYING;
      this.editorTapCount = 0;
    }).catch(() => { db.showToast('加载关卡失败'); });
  }

  showRanking() {
    api.getLeaderboard().then(data => {
      GameGlobal.main.dialog.showLeaderboard(data.rankings || []);
    }).catch(() => {
      GameGlobal.databus.showToast('加载排行榜失败');
    });
  }

  showStudyRecords() {
    GameGlobal.main.dialog.showSavedIdioms();
  }

  // --- Touch handlers for scroll ---

  onTouchStart(x, y) {
    this._inertiaId++; // cancel running inertia
    this._dragStartY = y;
    this._dragStartScrollY = this.scrollY;
    this._dragging = true;
    this._wasDrag = false;
    this._velocity = 0;
    this._lastTouchY = y;
    this._lastTouchTime = Date.now();
  }

  onTouchMove(x, y) {
    if (!this._dragging || this.maxScrollY <= 0) return;
    const dy = this._dragStartY - y;
    if (Math.abs(dy) > 8) {
      this._wasDrag = true;
    }
    if (!this._wasDrag) return;
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, this._dragStartScrollY + dy));

    // Track velocity for inertia
    const now = Date.now();
    const dt = now - this._lastTouchTime;
    if (dt > 0) {
      this._velocity = (this._lastTouchY - y) / dt;
    }
    this._lastTouchY = y;
    this._lastTouchTime = now;
  }

  onTouchEnd(x, y) {
    this._dragging = false;
    if (this._wasDrag) {
      this._applyInertia();
      return;
    }
    // Not a drag — process as tap
    this._processTap(x, y);
  }

  _applyInertia() {
    let v = this._velocity;
    const decay = 0.92;
    const id = ++this._inertiaId;
    const step = () => {
      if (id !== this._inertiaId) return; // cancelled
      v *= decay;
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY - v * 16));
      if (Math.abs(v) > 0.05 && this.scrollY > 0 && this.scrollY < this.maxScrollY) {
        requestAnimationFrame(step);
      } else {
        this.scrollY = Math.max(0, Math.min(this.maxScrollY, Math.round(this.scrollY)));
      }
    };
    requestAnimationFrame(step);
  }

  // --- Hit test with scroll ---

  _processTap(x, y) {
    const db = GameGlobal.databus;

    // 连续点击标题 5 次进入编辑器
    if (y < 80) {
      this.editorTapCount++;
      if (this.editorTapCount >= 5) {
        this.editorTapCount = 0;
        db.screen = ScreenState.EDITOR;
        return;
      }
    } else {
      this.editorTapCount = 0;
    }

    const sy = y + this.scrollY;

    for (const btn of this.levelBtns) {
      if (this._btnHit(btn, x, sy)) { btn.onClick(); return; }
    }
    if (this.prevBtn && this._btnHit(this.prevBtn, x, sy)) { this.prevBtn.onClick(); return; }
    if (this.nextBtn && this._btnHit(this.nextBtn, x, sy)) { this.nextBtn.onClick(); return; }
    if (this.rankBtn && this._btnHit(this.rankBtn, x, sy)) { this.rankBtn.onClick(); return; }
    if (this.studyBtn && this._btnHit(this.studyBtn, x, sy)) { this.studyBtn.onClick(); return; }
    if (this.staminaAdBtn && this._btnHit(this.staminaAdBtn, x, sy)) { this.staminaAdBtn.onClick(); return; }

    // mute button is at fixed position (top-right)
    if (this.muteBtn && this.muteBtn.hitTest(x, y)) { this.muteBtn.onClick(); return; }
  }

  _btnHit(btn, px, py) {
    return btn.enabled &&
      px >= btn.x && px <= btn.x + btn.width &&
      py >= btn.y && py <= btn.y + btn.height;
  }

  // --- Rendering ---

  draw(ctx) {
    // Clip to visible area (below title)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.clip();

    const sy = this.scrollY;

    // Title (fixed, not affected by scroll)
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('成语拼拼乐', SCREEN_WIDTH / 2, 60);

    // Level buttons with scroll offset
    ctx.save();
    ctx.translate(0, -sy);
    this.levelBtns.forEach(b => b.draw(ctx));
    if (this.prevBtn) this.prevBtn.draw(ctx);
    if (this.nextBtn) this.nextBtn.draw(ctx);

    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((this.page + 1) + ' / ' + this.totalPages, SCREEN_WIDTH / 2, this.pageLabelY);

    if (this.rankBtn) this.rankBtn.draw(ctx);
    if (this.studyBtn) this.studyBtn.draw(ctx);
    if (this.staminaAdBtn) this.staminaAdBtn.draw(ctx);
    ctx.restore();

    // Mute button (fixed at top)
    if (this.muteBtn) this.muteBtn.draw(ctx);

    // Scrollbar
    if (this.maxScrollY > 0) {
      this._drawScrollbar(ctx);
    }

    ctx.restore();
  }

  _drawScrollbar(ctx) {
    const barW = 4;
    const barX = SCREEN_WIDTH - barW - 4;
    const trackTop = 80;
    const trackH = SCREEN_HEIGHT - trackTop;
    const thumbH = Math.max(36, trackH * (SCREEN_HEIGHT / this.contentHeight));
    const thumbTravel = trackH - thumbH;
    const thumbY = trackTop + (this.scrollY / this.maxScrollY) * thumbTravel;

    // Track
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    this._roundRect(ctx, barX, trackTop, barW, trackH, barW / 2);
    ctx.fill();

    // Thumb
    if (thumbH < trackH) {
      ctx.fillStyle = 'rgba(0,0,0,0.20)';
      this._roundRect(ctx, barX, thumbY, barW, thumbH, barW / 2);
      ctx.fill();
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
