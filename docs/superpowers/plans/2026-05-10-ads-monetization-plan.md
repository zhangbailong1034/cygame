# 广告系统、签到、新手引导、音效 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rewarded video ads, daily sign-in, new-player tutorial, and sound effects to the idiom puzzle game.

**Architecture:** Four new client modules (AdManager, SoundManager, DailySign, Tutorial) integrated through Main.js with DataBus state sharing. Two new server API endpoints. All UI rendered via Canvas 2D.

**Tech Stack:** WeChat Mini Game API (wx.createRewardedVideoAd, wx.createBannerAd, wx.createInnerAudioContext), Express 5.x, Sequelize, MySQL

---

### Task 1: Update User model with sign tracking fields

**Files:**
- Modify: `server/models/User.js`

- [ ] **Step 1: Add last_sign_date and sign_streak to User model**

Replace the User model (server/models/User.js) with:

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  open_id: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  nick_name: { type: DataTypes.STRING(32), defaultValue: '玩家' },
  avatar_url: { type: DataTypes.STRING(256), defaultValue: '' },
  current_level: { type: DataTypes.INTEGER, defaultValue: 1 },
  total_score: { type: DataTypes.INTEGER, defaultValue: 0 },
  stamina: { type: DataTypes.INTEGER, defaultValue: 10 },
  last_stamina_recover: { type: DataTypes.DATE, defaultValue: null },
  last_sign_date: { type: DataTypes.DATEONLY, defaultValue: null },
  sign_streak: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'users' });

module.exports = User;
```

- [ ] **Step 2: Commit**

```bash
git add server/models/User.js
git commit -m "feat: add last_sign_date and sign_streak to User model"
```

---

### Task 2: Update userService with streak-based dailySign and doubleScore

**Files:**
- Modify: `server/services/userService.js`

- [ ] **Step 1: Read current userService.js**

- [ ] **Step 2: Replace userService.js with updated version**

```javascript
const { User } = require('../models');

const STAMINA_MAX = 10;
const STAMINA_RECOVER_MINUTES = 5;

const SIGN_REWARDS = [
  { stamina: 1, score: 0,  hintCards: 0 },  // day 1
  { stamina: 1, score: 0,  hintCards: 0 },  // day 2
  { stamina: 1, score: 5,  hintCards: 0 },  // day 3
  { stamina: 1, score: 0,  hintCards: 0 },  // day 4
  { stamina: 1, score: 0,  hintCards: 1 },  // day 5
  { stamina: 2, score: 0,  hintCards: 0 },  // day 6
  { stamina: 3, score: 20, hintCards: 1 },  // day 7
];

async function loginOrRegister(openId) {
  let user = await User.findOne({ where: { open_id: openId } });
  if (!user) {
    user = await User.create({
      open_id: openId,
      nick_name: '玩家' + openId.slice(0, 6),
      stamina: STAMINA_MAX,
    });
  }
  return user;
}

async function getUser(openId) {
  return User.findOne({ where: { open_id: openId } });
}

async function recoverStamina(user) {
  const now = new Date();
  if (!user.last_stamina_recover) {
    user.last_stamina_recover = now;
    await user.save();
    return user;
  }
  const elapsed = Math.floor((now - user.last_stamina_recover) / 60000);
  const recovered = Math.floor(elapsed / STAMINA_RECOVER_MINUTES);
  if (recovered > 0 && user.stamina < STAMINA_MAX) {
    user.stamina = Math.min(STAMINA_MAX, user.stamina + recovered);
    user.last_stamina_recover = new Date(now - (elapsed % STAMINA_RECOVER_MINUTES) * 60000);
    await user.save();
  }
  return user;
}

async function dailySign(user) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Check if already signed today
  if (user.last_sign_date === today) {
    throw Object.assign(new Error('今日已签到'), { status: 400, code: 'already_signed' });
  }

  // Calculate streak: consecutive days?
  if (user.last_sign_date === yesterday) {
    user.sign_streak = (user.sign_streak % 7) + 1; // wrap at 7
  } else {
    user.sign_streak = 1; // reset streak
  }

  const reward = SIGN_REWARDS[user.sign_streak - 1];
  user.stamina = Math.min(STAMINA_MAX, user.stamina + reward.stamina);
  user.total_score += reward.score;
  user.last_sign_date = today;
  await user.save();

  return {
    user,
    reward: { ...reward, streak: user.sign_streak },
  };
}

function getSignStatus(user) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    todaySigned: user.last_sign_date === today,
    signStreak: user.sign_streak,
  };
}

async function doubleScore(user, scoreDelta) {
  user.total_score += scoreDelta;
  await user.save();
  return user;
}

module.exports = { loginOrRegister, getUser, recoverStamina, dailySign, getSignStatus, doubleScore };
```

- [ ] **Step 3: Commit**

```bash
git add server/services/userService.js
git commit -m "feat: streak-based daily sign rewards, doubleScore, getSignStatus"
```

---

### Task 3: Update authController with doubleScore and sign status

**Files:**
- Modify: `server/controllers/authController.js`

- [ ] **Step 1: Replace authController.js**

```javascript
const userService = require('../services/userService');

async function login(req, res, next) {
  try {
    const { openId } = req.body;
    const user = await userService.loginOrRegister(openId);
    const signStatus = userService.getSignStatus(user);
    res.json({ token: openId, user: {
      stamina: user.stamina,
      total_score: user.total_score,
      current_level: user.current_level,
      ...signStatus,
    } });
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    let user = await userService.getUser(req.openId);
    if (!user) return res.status(404).json({ error: 'not_found' });
    user = await userService.recoverStamina(user);
    const signStatus = userService.getSignStatus(user);
    res.json({ user: {
      stamina: user.stamina,
      total_score: user.total_score,
      current_level: user.current_level,
      ...signStatus,
    } });
  } catch (err) { next(err); }
}

async function recoverStamina(req, res, next) {
  try {
    let user = await userService.getUser(req.openId);
    user = await userService.recoverStamina(user);
    res.json({ stamina: user.stamina });
  } catch (err) { next(err); }
}

async function dailySign(req, res, next) {
  try {
    let user = await userService.getUser(req.openId);
    const result = await userService.dailySign(user);
    res.json({
      stamina: result.user.stamina,
      totalScore: result.user.total_score,
      reward: result.reward,
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.code, message: err.message });
    }
    next(err);
  }
}

async function doubleScore(req, res, next) {
  try {
    const { scoreDelta } = req.body;
    let user = await userService.getUser(req.openId);
    user = await userService.doubleScore(user, scoreDelta);
    res.json({ totalScore: user.total_score });
  } catch (err) { next(err); }
}

module.exports = { login, getMe, recoverStamina, dailySign, doubleScore };
```

- [ ] **Step 2: Commit**

```bash
git add server/controllers/authController.js
git commit -m "feat: add doubleScore, return sign status in getMe/login"
```

---

### Task 4: Add /user/double-score route

**Files:**
- Modify: `server/routes/index.js`

- [ ] **Step 1: Add route**

In server/routes/index.js, add one line after the existing daily-sign route:

```javascript
router.post('/user/daily-sign', auth, authCtrl.dailySign);
```

Add after it:

```javascript
router.post('/user/double-score', auth, authCtrl.doubleScore);
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/index.js
git commit -m "feat: add /user/double-score route"
```

---

### Task 5: Extend DataBus with new fields

**Files:**
- Modify: `js/databus.js`

- [ ] **Step 1: Add new fields to DataBus class**

In `js/databus.js`, add the following fields inside the class body (after `savedIdioms = [];`):

```javascript
  // 广告 & 签到
  hintCards = 0;
  todaySigned = false;
  signStreak = 0;

  // 音效
  soundMuted = false;

  // 引导
  tutorialDone = false;
```

The class should now have these fields (showing the new ones in context):

```javascript
  savedIdioms = []; // { answer, meaning }

  // 广告 & 签到
  hintCards = 0;
  todaySigned = false;
  signStreak = 0;

  // 音效
  soundMuted = false;

  // 引导
  tutorialDone = false;
```

- [ ] **Step 2: Commit**

```bash
git add js/databus.js
git commit -m "feat: add hintCards, sign, sound, tutorial fields to DataBus"
```

---

### Task 6: Create AdManager module

**Files:**
- Create: `js/ads/AdManager.js`

- [ ] **Step 1: Create the file**

```javascript
const AD_UNITS = {
  rewarded: 'adunit-xxxxxxxx',
  banner: 'adunit-yyyyyyyy',
};

export class AdManager {
  constructor() {
    this.rewardedVideoAd = null;
    this.bannerAd = null;
    this.pendingReward = null;
    this.onRewardCallback = null;
  }

  init() {
    try {
      this.rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: AD_UNITS.rewarded });
      this.rewardedVideoAd.onLoad(() => {});
      this.rewardedVideoAd.onError((err) => { console.log('[Ad] rewarded video error:', err); });
      this.rewardedVideoAd.onClose((res) => {
        if (res && res.isEnded) {
          this._grantReward();
        } else {
          GameGlobal.databus.showToast('看完广告才能获得奖励哦');
          this.pendingReward = null;
          this.onRewardCallback = null;
        }
      });
    } catch (e) { console.log('[Ad] rewarded video not supported:', e); }

    try {
      this.bannerAd = wx.createBannerAd({
        adUnitId: AD_UNITS.banner,
        style: { left: 0, top: 0, width: 300 },
      });
      this.bannerAd.onError((err) => { console.log('[Ad] banner error:', err); });
    } catch (e) { console.log('[Ad] banner not supported:', e); }
  }

  showRewarded(type, cb) {
    if (!this.rewardedVideoAd) {
      GameGlobal.databus.showToast('广告功能暂不可用');
      return;
    }
    this.pendingReward = type;
    this.onRewardCallback = cb || null;
    this.rewardedVideoAd.show().catch(() => {
      this.rewardedVideoAd.load().then(() => this.rewardedVideoAd.show()).catch(() => {
        GameGlobal.databus.showToast('广告加载失败，请稍后再试');
      });
    });
  }

  _grantReward() {
    const db = GameGlobal.databus;
    const api = require('../api/index').api;

    switch (this.pendingReward) {
      case 'stamina':
        api.recoverStamina().then(res => {
          db.stamina = res.stamina;
          db.showToast('获得 +3 体力');
          if (this.onRewardCallback) this.onRewardCallback();
        });
        break;
      case 'hint':
        db.hintCards = (db.hintCards || 0) + 1;
        db.showToast('获得 1 次免费提示');
        if (this.onRewardCallback) this.onRewardCallback();
        break;
      case 'double_score':
        if (this.onRewardCallback) this.onRewardCallback();
        break;
    }
    this.pendingReward = null;
  }

  showBanner() {
    if (this.bannerAd) {
      this.bannerAd.show().catch(() => {});
    }
  }

  hideBanner() {
    if (this.bannerAd) {
      this.bannerAd.hide().catch(() => {});
    }
  }

  destroy() {
    if (this.rewardedVideoAd) this.rewardedVideoAd.destroy();
    if (this.bannerAd) this.bannerAd.destroy();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/ads/AdManager.js
git commit -m "feat: add AdManager for rewarded video and banner ads"
```

---

### Task 7: Create SoundManager module

**Files:**
- Create: `js/audio/SoundManager.js`

- [ ] **Step 1: Create the file**

```javascript
const SFX_FILES = {
  click: 'audio/click.mp3',
  place_ok: 'audio/place_ok.mp3',
  place_fail: 'audio/place_fail.mp3',
  complete: 'audio/complete.mp3',
  hint: 'audio/hint.mp3',
  sign: 'audio/sign.mp3',
};

const BGM_FILES = {
  menu: 'audio/bgm_menu.mp3',
  game: 'audio/bgm_game.mp3',
};

export class SoundManager {
  constructor() {
    this._bgmCtx = null;
    this._sfxCtx = null;
    this._muted = false;
    this._currentBgm = null;
    this._audioUnlocked = false;
  }

  init() {
    try {
      this._muted = wx.getStorageSync('sound_muted') || false;
    } catch (e) { this._muted = false; }
    GameGlobal.databus.soundMuted = this._muted;
  }

  _unlockAudio() {
    if (this._audioUnlocked) return;
    this._audioUnlocked = true;
    // Create contexts on first user interaction
    this._bgmCtx = wx.createInnerAudioContext();
    this._bgmCtx.volume = this._muted ? 0 : 0.6;
    this._sfxCtx = wx.createInnerAudioContext();
    this._sfxCtx.volume = this._muted ? 0 : 1.0;
  }

  playBgm(scene) {
    this._unlockAudio();
    if (!this._bgmCtx) return;
    const src = BGM_FILES[scene];
    if (!src) return;
    if (this._currentBgm === src) return;
    this._currentBgm = src;
    this._bgmCtx.stop();
    this._bgmCtx.src = src;
    this._bgmCtx.loop = true;
    this._bgmCtx.play().catch(() => {}); // Audio file may not exist yet
  }

  stopBgm() {
    if (this._bgmCtx) {
      this._bgmCtx.stop();
      this._currentBgm = null;
    }
  }

  playSfx(name) {
    this._unlockAudio();
    if (!this._sfxCtx) return;
    const src = SFX_FILES[name];
    if (!src) return;
    this._sfxCtx.stop();
    this._sfxCtx.src = src;
    this._sfxCtx.play().catch(() => {}); // Silently skip if file missing
  }

  toggleMute() {
    this._muted = !this._muted;
    GameGlobal.databus.soundMuted = this._muted;
    try { wx.setStorageSync('sound_muted', this._muted); } catch (e) {}
    const vol = this._muted ? 0 : 0.6;
    if (this._bgmCtx) this._bgmCtx.volume = vol;
    if (this._sfxCtx) this._sfxCtx.volume = this._muted ? 0 : 1.0;
  }

  get muted() { return this._muted; }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/audio/SoundManager.js
git commit -m "feat: add SoundManager for bgm and sfx"
```

---

### Task 8: Create DailySign module

**Files:**
- Create: `js/game/DailySign.js`

- [ ] **Step 1: Create the file**

```javascript
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
      this.signBtn.text = '已签到 ✓';
      this.signBtn.color = '#b0b0b0';
    } else {
      this.signBtn.text = '签到';
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
      this.signBtn.text = '已签到 ✓';
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
    this.animTimer = 60; // 1 second at 60fps
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

    // Dim background
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const panelW = 320, panelH = 280;
    const px = (SCREEN_WIDTH - panelW) / 2;
    const py = (SCREEN_HEIGHT - panelH) / 2;

    // Panel
    ctx.fillStyle = '#fff';
    this._roundRect(ctx, px, py, panelW, panelH, 14);
    ctx.fill();

    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('每日签到', px + panelW / 2, py + 32);

    // 7-day bar
    const barY = py + 56;
    const slotW = 32, slotH = 44, slotGap = 8;
    const totalW = 7 * slotW + 6 * slotGap;
    const startX = px + (panelW - totalW) / 2;

    for (let i = 0; i < 7; i++) {
      const sx = startX + i * (slotW + slotGap);
      const isToday = i === this.streak && !this.todaySigned;
      const isSigned = this.todaySigned ? (i < this.streak % 7 || this.streak >= 7) : (i < this.streak);

      // Day label
      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(DAY_LABELS[i], sx + slotW / 2, barY - 6);

      // Slot
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

    // Reward description
    const descIdx = this.todaySigned ? (this.streak - 1) % 7 : this.streak % 7;
    const desc = REWARD_DESC[descIdx >= 0 ? descIdx : 0];
    ctx.fillStyle = '#e8a840';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    const lines = desc.split('\n');
    let descY = barY + slotH + 18;
    for (const line of lines) {
      ctx.fillText('今日奖励：' + (lines.length > 1 ? '' : '') + line, px + panelW / 2, descY);
      descY += 18;
    }

    // Sign button
    this.signBtn.x = px + panelW / 2 - 60;
    this.signBtn.y = py + panelH - 60;
    this.signBtn.draw(ctx);

    // Close button
    this.closeBtn.x = px + panelW - 90;
    this.closeBtn.y = py + 8;
    this.closeBtn.draw(ctx);

    // Animation particles
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
```

- [ ] **Step 2: Commitment**

```bash
git add js/game/DailySign.js
git commit -m "feat: add DailySign module with 7-day streak rewards"
```

---

### Task 9: Create Tutorial module

**Files:**
- Create: `js/game/Tutorial.js`

- [ ] **Step 1: Create the file**

```javascript
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { Button } from '../ui/Button';

const STEPS = [
  {
    text: '这是成语填字网格\n固定字已帮你填好',
    highlight: 'grid',
    arrowX: null, arrowY: null, // computed dynamically
  },
  {
    text: '从下方碎片区选择\n正确的字或词',
    highlight: 'fragments',
    arrowX: null, arrowY: null,
  },
  {
    text: '点击碎片选中\n再点击空格放入',
    highlight: 'demo',
    arrowX: null, arrowY: null,
  },
  {
    text: '提示、洗牌、重置\n帮你过关',
    highlight: 'buttons',
    arrowX: null, arrowY: null,
  },
  {
    text: '体力用完就不能操作了哦\n可以通过签到和广告恢复',
    highlight: 'stamina',
    arrowX: null, arrowY: null,
  },
];

export class Tutorial {
  constructor() {
    this.active = false;
    this.currentStep = 0;
    this._skipBtn = new Button(0, 0, 60, 30, '跳过', 'rgba(255,255,255,0.5)');
    this._skipBtn.onClick = () => this._finish();
    this._nextBtn = new Button(0, 0, 80, 32, '下一步', '#4a90d9');
    this._nextBtn.onClick = () => this._next();
    this._doneBtn = new Button(0, 0, 100, 36, '开始游戏', '#4caf50');
    this._doneBtn.onClick = () => this._finish();
  }

  start() {
    this.active = true;
    this.currentStep = 0;
  }

  _next() {
    this.currentStep++;
    if (this.currentStep >= STEPS.length) {
      this._finish();
    }
  }

  _finish() {
    this.active = false;
    GameGlobal.databus.tutorialDone = true;
    try { wx.setStorageSync('tutorial_done', true); } catch (e) {}
  }

  onTouch(x, y) {
    if (!this.active) return;
    const db = GameGlobal.databus;

    // Step 3: demo step - detect actual fragment placement
    if (this.currentStep === 2 && db.screen === 'PLAYING' && db.usedFragments.length > 0) {
      this._next();
      return;
    }

    // Skip/next buttons
    if (this.currentStep < STEPS.length - 1) {
      this._skipBtn.x = SCREEN_WIDTH - 70;
      this._skipBtn.y = 14;
      if (this._skipBtn.hitTest(x, y)) { this._skipBtn.onClick(); return; }

      this._nextBtn.x = SCREEN_WIDTH / 2 - 40;
      this._nextBtn.y = SCREEN_HEIGHT - 60;
      if (this._nextBtn.hitTest(x, y)) { this._nextBtn.onClick(); return; }
    } else {
      this._doneBtn.x = SCREEN_WIDTH / 2 - 50;
      this._doneBtn.y = SCREEN_HEIGHT - 60;
      if (this._doneBtn.hitTest(x, y)) { this._doneBtn.onClick(); return; }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const step = STEPS[this.currentStep];
    if (!step) return;

    // Full screen semi-transparent mask
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Cut out highlight area
    const rect = this._getHighlightRect(step.highlight);
    if (rect) {
      ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
      // Glow border
      ctx.strokeStyle = 'rgba(255,152,0,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
    }

    // Draw arrow
    if (rect) {
      this._drawArrow(ctx, rect);
    }

    // Text background
    const textW = 260, textH = 70;
    const textX = (SCREEN_WIDTH - textW) / 2;
    const textY = rect ? rect.y + rect.h + 20 : SCREEN_HEIGHT / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this._roundRect(ctx, textX, textY, textW, textH, 10);
    ctx.fill();

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const lines = step.text.split('\n');
    let lineY = textY + 26;
    for (const line of lines) {
      ctx.fillText(line, textX + textW / 2, lineY);
      lineY += 22;
    }

    // Buttons
    if (this.currentStep < STEPS.length - 1) {
      this._skipBtn.x = SCREEN_WIDTH - 70;
      this._skipBtn.y = 14;
      this._skipBtn.draw(ctx);
      this._nextBtn.x = SCREEN_WIDTH / 2 - 40;
      this._nextBtn.y = SCREEN_HEIGHT - 60;
      this._nextBtn.draw(ctx);
    } else {
      this._doneBtn.x = SCREEN_WIDTH / 2 - 50;
      this._doneBtn.y = SCREEN_HEIGHT - 60;
      this._doneBtn.draw(ctx);
    }

    // Step indicator
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((this.currentStep + 1) + ' / ' + STEPS.length, SCREEN_WIDTH / 2, SCREEN_HEIGHT - 76);
  }

  _getHighlightRect(highlight) {
    const main = GameGlobal.main;
    if (!main) return null;

    switch (highlight) {
      case 'grid': {
        const grid = main.grid;
        grid.getLayout();
        const panelPad = 16;
        return {
          x: grid.offsetX - panelPad,
          y: grid.offsetY - panelPad,
          w: GameGlobal.databus.cols * grid.cellSize + (GameGlobal.databus.cols - 1) * grid.gap + panelPad * 2,
          h: GameGlobal.databus.rows * grid.cellSize + (GameGlobal.databus.rows - 1) * grid.gap + panelPad * 2,
        };
      }
      case 'fragments': {
        const bar = main.fragmentBar;
        bar.getLayout();
        return {
          x: 0,
          y: bar.startY - 8,
          w: SCREEN_WIDTH,
          h: bar.totalHeight + 16,
        };
      }
      case 'demo':
        return { x: 40, y: SCREEN_HEIGHT * 0.45, w: SCREEN_WIDTH - 80, h: SCREEN_HEIGHT * 0.35 };
      case 'buttons': {
        const hud = main.hud;
        hud.getLayout();
        return {
          x: hud.hintBtn.x - 8,
          y: hud.yBottom - 8,
          w: SCREEN_WIDTH,
          h: SCREEN_HEIGHT - hud.yBottom + 8,
        };
      }
      case 'stamina':
        return { x: 4, y: hud ? main.hud.headerH + 2 : 52, w: SCREEN_WIDTH - 8, h: 54 };
      default:
        return null;
    }
  }

  _drawArrow(ctx, rect) {
    const arrowX = rect.x + rect.w / 2;
    const arrowY = rect.y - 10;
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - 8, arrowY - 16);
    ctx.lineTo(arrowX + 8, arrowY - 16);
    ctx.closePath();
    ctx.fill();
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
```

Note: The `_getHighlightRect` method references `main.hud` dynamically — fix the `stamina` case: replace `hud ? main.hud.headerH + 2 : 52` with `52` since the stamina area is the HUD status bar.

- [ ] **Step 2: Commit**

```bash
git add js/game/Tutorial.js
git commit -m "feat: add Tutorial module with 5-step new player guide"
```

---

### Task 10: Update Button.js for sound integration

**Files:**
- Modify: `js/ui/Button.js`

- [ ] **Step 1: Read current Button.js**

- [ ] **Step 2: Add sound effect call in click handling**

In Button.js, find where onClick is invoked. The Button class likely has an `onClick` property. No change is needed to the Button class itself — the sound is played by the caller. Instead, add a convenience method or just let every touch handler in main.js call the sound.

**Correction:** Since Button.onClick is called from various onTouch methods, the simplest approach is to play the click sound in the touch dispatchers. We'll handle this in Task 13 (Main.js) to avoid duplicating calls.

**No changes needed in Button.js** — sound will be triggered in the touch router.

- [ ] **Step 2 (skip): No changes to Button.js.**

---

### Task 11: Update HUD.js with ad entry, mute button, sound callbacks

**Files:**
- Modify: `js/ui/HUD.js`

- [ ] **Step 1: Add mute button and ad prompts to HUD**

In HUD.js, modify the constructor to add a mute button:

```javascript
// Add after this.resetBtn in constructor:
this.muteBtn = new Button(0, 0, 38, 28, '🔊', 'rgba(255,255,255,0.22)');
this.muteBtn.onClick = () => {
  GameGlobal.main.soundManager.toggleMute();
  this.muteBtn.text = GameGlobal.main.soundManager.muted ? '🔇' : '🔊';
};

// Update allButtons:
this.allButtons = [this.hintBtn, this.shuffleBtn, this.resetBtn, this.backBtn, this.muteBtn];
```

In `getLayout()`, position the mute button after backBtn:

```javascript
this.muteBtn.x = 62;
this.muteBtn.y = (this.headerH - 28) / 2;
```

In `handleHint()`, use hintCards first if available:

```javascript
handleHint() {
  const db = GameGlobal.databus;
  if (db.previewMode) { db.showToast('预览模式，无法使用提示'); return; }
  if (!db.firstCell) {
    db.showToast('请先点击一个空格再点提示');
    return;
  }
  const cell = db.firstCell;
  api.useHint(db.levelId, cell.row, cell.col, 'highlight').then(res => {
    db.showToast('正确碎片: ' + res.fragmentText);
    db.totalScore = res.totalScore;
  }).catch(() => db.showToast('提示失败'));
  // Don't check hintCards here — the hint cost is handled server-side
}
```

In `handleReset()`, add sound callback at the end:

The main sound calls happen through the touch router in main.js, so HUD itself doesn't need sound calls. But we should handle the "no stamina" case in handleHint, handleShuffle, handleReset — show an ad prompt.

Actually, keep it simple: the ad prompt for "no stamina" is better handled in the error response from the server (Grid.placeFragment already catches it). Let's not over-complicate HUD.

The key HUD change: add mute button + include it in allButtons array.

- [ ] **Step 2: Commit**

```bash
git add js/ui/HUD.js
git commit -m "feat: add mute button to HUD header"
```

---

### Task 12: Update MenuScreen.js with ad button, banner, sign popup, mute button

**Files:**
- Modify: `js/game/MenuScreen.js`

- [ ] **Step 1: Add components to MenuScreen**

In the constructor, add mute button:

After `this.studyBtn.onClick = ...`:

```javascript
this.muteBtn = new Button(SCREEN_WIDTH - 46, 8, 38, 28, '🔊', 'rgba(0,0,0,0.15)');
this.muteBtn.onClick = () => {
  GameGlobal.main.soundManager.toggleMute();
  this.muteBtn.text = GameGlobal.main.soundManager.muted ? '🔇' : '🔊';
};
```

After the rank/study buttons in buildButtons(), add an "ad for stamina" button:

```javascript
const adY = bottomY + 52;
this.staminaAdBtn = new Button(SCREEN_WIDTH / 2 - 106, adY, 212, 36, '📺 看广告 +3体力', '#ff9800');
this.staminaAdBtn.onClick = () => {
  GameGlobal.main.adManager.showRewarded('stamina');
};
```

Update `onTouch` to handle new buttons:

```javascript
if (this.staminaAdBtn && this.staminaAdBtn.hitTest(x, y)) { this.staminaAdBtn.onClick(); return; }
if (this.muteBtn && this.muteBtn.hitTest(x, y)) { this.muteBtn.onClick(); return; }
```

Update `draw` to render new buttons:

```javascript
if (this.staminaAdBtn) this.staminaAdBtn.draw(ctx);
if (this.muteBtn) this.muteBtn.draw(ctx);
```

Update `loadLevels()` to show sign popup:

After `this.buildButtons();` inside loadLevels, add:

```javascript
// Show daily sign popup if not signed today
if (!db.todaySigned) {
  GameGlobal.main.dailySign.show(db.signStreak, false);
}
```

Also in loadLevels, store sign data from the /user/me call. Since loadLevels calls getLevels, we also need to call getMe. Update loadLevels:

```javascript
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
    this.buildButtons();
    // Show Banner ad
    GameGlobal.main.adManager.showBanner();
    // Show sign popup if not signed
    if (!db.todaySigned) {
      GameGlobal.main.dailySign.show(db.signStreak, false);
    }
  } catch (e) {
    GameGlobal.databus.showToast('加载关卡失败');
  }
}
```

Also add `import { api } from '../api/index';` at the top (should already exist). Ensure the muteBtn text updates on draw.

- [ ] **Step 2: Commit**

```bash
git add js/game/MenuScreen.js
git commit -m "feat: add ad button, banner, sign popup, mute to menu"
```

---

### Task 13: Update Grid.js with double-score ad and sounds

**Files:**
- Modify: `js/game/Grid.js`

- [ ] **Step 1: Add double-score button to completion dialog**

In `placeFragment`, find the completion handler where `showIdioms` is called. Add a "double score" button before the existing buttons:

```javascript
const scoreDelta = res.scoreDelta || 0;
const buttons = [];

if (scoreDelta > 0) {
  buttons.push({
    label: '📺 翻倍积分',
    color: '#ff9800',
    onClick: () => {
      GameGlobal.main.adManager.showRewarded('double_score', () => {
        api.doubleScore(scoreDelta).then(r => {
          db.totalScore = r.totalScore;
          GameGlobal.main.dialog.hide();
          GameGlobal.main.dialog.showIdioms(
            '积分翻倍！',
            res.idioms || [],
            scoreDelta,
            [
              {
                label: '下一关',
                color: '#4a90d9',
                onClick: () => {
                  GameGlobal.main.dialog.hide();
                  GameGlobal.main.menu.startLevel(db.levelId + 1);
                }
              },
              {
                label: '返回',
                color: '#999',
                onClick: () => {
                  GameGlobal.main.dialog.hide();
                  db.screen = ScreenState.MENU;
                  GameGlobal.main.menu.loadLevels();
                }
              }
            ]
          );
        });
      });
    }
  });
}

buttons.push(
  { label: '下一关', color: '#4a90d9', onClick: () => { ... } },
  { label: '返回', color: '#999', onClick: () => { ... } }
);

GameGlobal.main.dialog.showIdioms('恭喜通关！', res.idioms || [], scoreDelta, buttons);
```

Also add the `api` import if not already present:

```javascript
import { api } from '../api/index';
```

(This is already imported at the top of Grid.js — verify it's present.)

Add sound calls in placeFragment:

```javascript
// After successful placement (in .then):
GameGlobal.main.soundManager.playSfx('place_ok');

// In .catch:
GameGlobal.main.soundManager.playSfx('place_fail');

// On completion:
GameGlobal.main.soundManager.playSfx('complete');
```

- [ ] **Step 2: Then we need to add `doubleScore` to the api object in js/api/index.js**

In `js/api/index.js`, add after `dailySign`:

```javascript
dailySign: () => request('POST', '/user/daily-sign'),
doubleScore: (scoreDelta) => request('POST', '/user/double-score', { scoreDelta }),
```

- [ ] **Step 3: Commit**

```bash
git add js/game/Grid.js js/api/index.js
git commit -m "feat: add double-score ad button, sound effects to Grid"
```

---

### Task 14: Update Main.js to integrate all new modules

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Add imports and initialize new modules**

Add at top of main.js:

```javascript
import { AdManager } from './ads/AdManager';
import { SoundManager } from './audio/SoundManager';
import { DailySign } from './game/DailySign';
import { Tutorial } from './game/Tutorial';
```

In the constructor, after `this.toast = new Toast();`:

```javascript
this.adManager = new AdManager();
this.soundManager = new SoundManager();
this.dailySign = new DailySign();
this.tutorial = new Tutorial();

this.adManager.init();
this.soundManager.init();
```

- [ ] **Step 2: Update init() to store sign data and check tutorial**

In the `init()` method, after login, update DataBus with sign status:

```javascript
db.todaySigned = loginRes.user.todaySigned;
db.signStreak = loginRes.user.signStreak;
```

After `await this.menu.loadLevels();` check for tutorial:

```javascript
if (!wx.getStorageSync('tutorial_done') && db.currentLevel === 1) {
  // Tutorial will start when first level loads
}
```

- [ ] **Step 3: Update handleTouch to route to new modules**

In `handleTouch(x, y)`, add Tutorial and DailySign interception at the very top (before dialog check):

```javascript
handleTouch(x, y) {
  const db = GameGlobal.databus;

  // Unlock audio on first touch
  this.soundManager._unlockAudio();

  // Tutorial overlay intercepts everything
  if (this.tutorial.active) {
    this.tutorial.onTouch(x, y);
    // Play click sound for tutorial navigation
    this.soundManager.playSfx('click');
    return;
  }

  // Daily sign popup intercepts (only on MENU screen)
  if (this.dailySign.visible && db.screen === ScreenState.MENU) {
    this.dailySign.onTouch(x, y);
    return;
  }

  // Sound for all touch interactions
  if (!this.dialog.visible) {
    this.soundManager.playSfx('click');
  }

  if (this.dialog.visible) {
    // ... existing dialog handling
  }
  // ... rest of existing code
}
```

- [ ] **Step 4: Update render() to draw new modules**

In `render()`, after drawing the toast:

```javascript
this.toast.draw(ctx);

// Draw tutorial overlay on top of everything
this.tutorial.draw(ctx);

this.dialog.draw(ctx);
```

Also trigger tutorial start when entering first level:

In `render()`, before drawing grid:

```javascript
if (db.screen === ScreenState.PLAYING) {
  // Start tutorial on first play if not done
  if (!db.tutorialDone && !this.tutorial.active && db.levelId === 1) {
    this.tutorial.start();
  }
  this.grid.draw(ctx);
  this.fragmentBar.draw(ctx);
  this.hud.draw(ctx);
}
```

- [ ] **Step 5: Add bgm switching in render()**

In `render()`, after background draw:

```javascript
if (db.screen === ScreenState.MENU) {
  this.soundManager.playBgm('menu');
  this.menu.draw(ctx);
} else if (db.screen === ScreenState.EDITOR) {
  this.soundManager.stopBgm();
  this.editor.draw(ctx);
} else {
  this.soundManager.playBgm('game');
  // ...
}
```

Also hide banner when leaving menu:

In the `startLevel` call (when a level starts), the screen changes from MENU to PLAYING. In `render()`, since we check `db.screen`, we can add banner show/hide:

```javascript
if (db.screen === ScreenState.MENU) {
  this.adManager.showBanner();
  // ...
} else {
  this.adManager.hideBanner();
  // ...
}
```

- [ ] **Step 6: Commit**

```bash
git add js/main.js
git commit -m "feat: integrate AdManager, SoundManager, DailySign, Tutorial into Main"
```

---

### Task 15: Update docs (prd.md, tech.md)

**Files:**
- Modify: `prd.md`
- Modify: `tech.md`

- [ ] **Step 1: Update prd.md**

Add these sections to prd.md:
- Section: "广告系统" — describe rewarded video ads (stamina, hint, double score) + banner ad
- Section: "每日签到" — 7-day streak rewards
- Section: "新手引导" — 5-step tutorial
- Section: "音效系统" — bgm + sfx with mute toggle

Update the UI diagram to show mute button, ad button, sign bar.

- [ ] **Step 2: Update tech.md**

Add to tech.md:
- Reference to new modules: AdManager, SoundManager, DailySign, Tutorial
- New server endpoints: `/user/double-score`
- Updated User model fields
- New API in client: `api.doubleScore()`
- Audio file structure

- [ ] **Step 3: Commit**

```bash
git add prd.md tech.md
git commit -m "docs: update prd and tech with ads, sign, tutorial, sound"
```

---

### Task 16: Final integration test and cleanup

**Files:**
- Modify: `js/game/Tutorial.js` (fix stamina highlight rect)
- Create: `audio/.gitkeep` (placeholder for audio files)

- [ ] **Step 1: Fix the stamina highlight rect in Tutorial.js**

Change line in `_getHighlightRect`:

```javascript
case 'stamina': {
  const hud = GameGlobal.main.hud;
  return { x: 4, y: hud ? hud.headerH + 2 : 52, w: SCREEN_WIDTH - 8, h: hud ? hud.statusH : 54 };
}
```

- [ ] **Step 2: Create audio placeholder**

```bash
mkdir -p audio
echo "Place audio files here. See docs/superpowers/specs/2026-05-10-ads-monetization-design.md for the list." > audio/README.txt
git add audio/README.txt
```

- [ ] **Step 3: Check for any missing imports or references**

Review all files for:
- `GameGlobal.main` references (ensure main is set in constructor before modules need it)
- `api` imports in files that use new endpoints
- SoundManager._unlockAudio is called (currently private method — need to expose or call differently)

Fix: Make `_unlockAudio` a public method. In SoundManager.js, rename `_unlockAudio` to `unlockAudio`.

- [ ] **Step 4: Final commit**

```bash
git add js/game/Tutorial.js audio/README.txt js/audio/SoundManager.js
git commit -m "fix: expose unlockAudio, fix tutorial stamina rect, add audio placeholder"
```

---

## Implementation Order

Tasks must be executed in this order due to dependencies:

1. Task 1 → User model (server)
2. Task 2 → userService (server, depends on Task 1)
3. Task 3 → authController (server, depends on Task 2)
4. Task 4 → routes (server, depends on Task 3)
5. Task 5 → DataBus (client, no deps)
6. Task 6 → AdManager (client, no deps)
7. Task 7 → SoundManager (client, no deps)
8. Task 8 → DailySign (client, depends on Task 5)
9. Task 9 → Tutorial (client, no deps)
10. Task 10 → Button.js (client — actually no changes needed)
11. Task 11 → HUD.js (client, depends on Task 7)
12. Task 12 → MenuScreen.js (client, depends on Tasks 5,6,7,8)
13. Task 13 → Grid.js (client, depends on Tasks 5,6,7)
14. Task 14 → Main.js (client, depends on ALL above)
15. Task 15 → docs (depends on all)
16. Task 16 → cleanup

Tasks 5, 6, 7, 9 can run in parallel (no dependencies between them).
Tasks 10 can be skipped (no Button.js changes needed).
