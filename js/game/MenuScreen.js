import { SCREEN_WIDTH } from '../render';
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
  }

  async loadLevels() {
    try {
      const data = await api.getLevels();
      GameGlobal.databus.levels = data.levels;
      this.buildButtons();
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
      // current=gold, completed=blue, locked=gray — all clickable
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
      this.prevBtn.onClick = () => { this.page--; this.buildButtons(); };
    }
    if (this.page < this.totalPages - 1) {
      this.nextBtn = new Button(SCREEN_WIDTH / 2 + 6, pageNavY, pageNavW, this.pageBtnH, '下一页 →', '#8a8a8a');
      this.nextBtn.onClick = () => { this.page++; this.buildButtons(); };
    }

    // Page indicator below buttons
    this.pageLabelY = pageNavY + this.pageBtnH + 14;

    const bottomY = this.pageLabelY + 14;
    this.rankBtn = new Button(SCREEN_WIDTH / 2 - 106, bottomY, 100, 40, '排行榜', '#e8a840');
    this.rankBtn.onClick = () => this.showRanking();

    this.studyBtn = new Button(SCREEN_WIDTH / 2 + 6, bottomY, 100, 40, '学习记录', '#6c9bd2');
    this.studyBtn.onClick = () => this.showStudyRecords();
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

  onTouch(x, y) {
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

    for (const btn of this.levelBtns) {
      if (btn.hitTest(x, y) && btn.onClick) { btn.onClick(); return; }
    }
    if (this.prevBtn && this.prevBtn.hitTest(x, y)) { this.prevBtn.onClick(); return; }
    if (this.nextBtn && this.nextBtn.hitTest(x, y)) { this.nextBtn.onClick(); return; }
    if (this.rankBtn && this.rankBtn.hitTest(x, y)) { this.rankBtn.onClick(); return; }
    if (this.studyBtn && this.studyBtn.hitTest(x, y)) { this.studyBtn.onClick(); return; }
  }

  draw(ctx) {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('成语拼拼乐', SCREEN_WIDTH / 2, 60);

    this.levelBtns.forEach(b => b.draw(ctx));
    if (this.prevBtn) this.prevBtn.draw(ctx);
    if (this.nextBtn) this.nextBtn.draw(ctx);

    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((this.page + 1) + ' / ' + this.totalPages, SCREEN_WIDTH / 2, this.pageLabelY);

    if (this.rankBtn) this.rankBtn.draw(ctx);
    if (this.studyBtn) this.studyBtn.draw(ctx);
  }
}
