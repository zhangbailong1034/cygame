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
    const cols = 3;
    const btnW = 80, btnH = 50, gap = 12;
    const totalW = cols * btnW + (cols - 1) * gap;
    const startX = (SCREEN_WIDTH - totalW) / 2;

    db.levels.forEach((lvl, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + gap);
      const y = this.startY + row * (btnH + gap);
      const unlocked = lvl.level_id <= db.currentLevel;
      const btn = new Button(x, y, btnW, btnH, '第' + lvl.level_id + '关',
        unlocked ? '#4a90d9' : '#cccccc');
      btn.enabled = unlocked;
      btn.onClick = () => this.startLevel(lvl.level_id);
      this.levelBtns.push(btn);
    });

    this.rankBtn = new Button(SCREEN_WIDTH / 2 - 50, this.startY + Math.ceil(db.levels.length / cols) * (btnH + gap) + 20,
      100, 40, '排行榜', '#e8a840');
    this.rankBtn.onClick = () => this.showRanking();
  }

  startLevel(levelId) {
    const db = GameGlobal.databus;
    console.log('[Menu] 进入关卡:', levelId);
    db.levelId = levelId;
    api.getLevelData(levelId).then(data => {
      console.log('[Menu] 关卡数据加载成功');
      db.rows = data.rows;
      db.cols = data.cols;
      db.gridState = data.gridState;
      db.fragments = data.fragments;
      db.distractors = data.distractors;
      db.stamina = data.stamina;
      db.totalScore = data.totalScore;
      db.reset();
      db.screen = ScreenState.PLAYING;
      this.editorTapCount = 0;
    }).catch((e) => { console.error('[Menu] 加载关卡失败:', e); db.showToast('加载关卡失败'); });
  }

  showRanking() {
    api.getLeaderboard().then(data => {
      const top10 = (data.rankings || []).slice(0, 10);
      if (top10.length === 0) {
        GameGlobal.databus.showToast('暂无排行数据');
        return;
      }
      const msg = top10.map(
        r => r.rank + '. ' + r.nickName + '  ' + r.totalScore + '分'
      ).join(' | ');
      GameGlobal.databus.showToast(msg);
    }).catch(() => {});
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
    if (this.rankBtn && this.rankBtn.hitTest(x, y)) { this.rankBtn.onClick(); return; }
  }

  draw(ctx) {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('成语拼拼乐', SCREEN_WIDTH / 2, 60);

    this.levelBtns.forEach(b => b.draw(ctx));
    if (this.rankBtn) this.rankBtn.draw(ctx);
  }
}
