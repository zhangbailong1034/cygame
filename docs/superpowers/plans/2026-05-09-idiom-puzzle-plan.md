# 成语碎片拼合游戏 实施计划

> **For agentic workers:** 使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐步实施。每步使用 checkbox (`- [ ]`) 跟踪进度。

**目标：** 将飞机大战模板替换为成语碎片拼合游戏，包含 Express 后端 + MySQL 数据库 + Canvas 前端。

**架构：** Express MVC 后端服务于 `localhost:3000`，Sequelize 连接 MySQL `pygame_dev`。微信小游戏 Canvas 前端通过 `wx.request` 调用 REST API，纯点击交互。

**技术栈：** 微信小游戏 Canvas + Node.js/Express + Sequelize + MySQL

---

## 任务 0：清理旧代码与项目初始化

**文件：**
- 删除: `js/player/`, `js/npc/`, `js/runtime/`, `audio/`, `images/` (保留目录结构)
- 创建: `server/` 目录结构
- 修改: `js/main.js`, `js/databus.js`

### 步骤 0.1：删除飞机大战相关代码

```bash
cd d:/aiprojects/cygame
rm -rf js/player js/npc js/runtime
rm -rf audio images
mkdir -p js/game js/ui js/api
mkdir -p server/config server/models server/controllers server/services server/routes server/middleware server/seeds
```

### 步骤 0.2：初始化后端 npm 项目

在 `server/` 目录下创建 `package.json`：

```bash
cd d:/aiprojects/cygame/server
npm init -y
npm install express mysql2 sequelize cors uuid
```

### 步骤 0.3：提交

```bash
git add -A
git commit -m "chore: clean old shooter code, init server directory"
```

---

## 任务 1：数据库配置与模型定义

**文件：**
- 创建: `server/config/database.js`
- 创建: `server/models/index.js`
- 创建: `server/models/User.js`
- 创建: `server/models/LevelConfig.js`
- 创建: `server/models/UserProgress.js`
- 创建: `server/models/Leaderboard.js`
- 创建: `server/models/HintLog.js`

### 步骤 1.1：创建数据库配置文件

```javascript
// server/config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('pygame_dev', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

module.exports = sequelize;
```

### 步骤 1.2：创建 User 模型

```javascript
// server/models/User.js
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
}, { tableName: 'users' });

module.exports = User;
```

### 步骤 1.3：创建 LevelConfig 模型

```javascript
// server/models/LevelConfig.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LevelConfig = sequelize.define('LevelConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  level_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  rows: { type: DataTypes.INTEGER, allowNull: false },
  cols: { type: DataTypes.INTEGER, allowNull: false },
  fixed_cells: { type: DataTypes.JSON, allowNull: false },
  idioms: { type: DataTypes.JSON, allowNull: false },
  fragments: { type: DataTypes.JSON, allowNull: false },
  distractors: { type: DataTypes.JSON, defaultValue: [] },
  difficulty: { type: DataTypes.ENUM('easy', 'medium', 'hard'), defaultValue: 'easy' },
  min_score: { type: DataTypes.INTEGER, defaultValue: 50 },
}, { tableName: 'level_configs', timestamps: false });

module.exports = LevelConfig;
```

### 步骤 1.4：创建 UserProgress 模型

```javascript
// server/models/UserProgress.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserProgress = sequelize.define('UserProgress', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  level_id: { type: DataTypes.INTEGER, allowNull: false },
  grid_state: { type: DataTypes.JSON, defaultValue: null },
  used_fragments: { type: DataTypes.JSON, defaultValue: [] },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completed_at: { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'user_progress' });

module.exports = UserProgress;
```

### 步骤 1.5：创建 Leaderboard 和 HintLog 模型

```javascript
// server/models/Leaderboard.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Leaderboard = sequelize.define('Leaderboard', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  rankings: { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'leaderboards', timestamps: false });

module.exports = Leaderboard;
```

```javascript
// server/models/HintLog.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HintLog = sequelize.define('HintLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  level_id: { type: DataTypes.INTEGER, allowNull: false },
  row: { type: DataTypes.INTEGER, allowNull: false },
  col: { type: DataTypes.INTEGER, allowNull: false },
  hint_type: { type: DataTypes.ENUM('highlight', 'autofill'), defaultValue: 'highlight' },
}, { tableName: 'hint_logs', updatedAt: false });

module.exports = HintLog;
```

### 步骤 1.6：创建模型索引文件

```javascript
// server/models/index.js
const sequelize = require('../config/database');
const User = require('./User');
const LevelConfig = require('./LevelConfig');
const UserProgress = require('./UserProgress');
const Leaderboard = require('./Leaderboard');
const HintLog = require('./HintLog');

User.hasMany(UserProgress, { foreignKey: 'user_id' });
UserProgress.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { sequelize, User, LevelConfig, UserProgress, Leaderboard, HintLog };
```

### 步骤 1.7：同步数据库并提交

```bash
cd d:/aiprojects/cygame
git add server/
git commit -m "feat: add database config and all models"
```

---

## 任务 2：Express 应用骨架与中间件

**文件：**
- 创建: `server/app.js`
- 创建: `server/middleware/auth.js`
- 创建: `server/middleware/errorHandler.js`

### 步骤 2.1：创建鉴权中间件

```javascript
// server/middleware/auth.js
function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'no_token', message: '请先登录' });
  }
  // 本地开发：token 即是 open_id
  req.openId = token.replace('Bearer ', '');
  next();
}

module.exports = authMiddleware;
```

### 步骤 2.2：创建错误处理中间件

```javascript
// server/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.code || 'internal_error',
    message: err.message || '服务器错误',
  });
}

module.exports = errorHandler;
```

### 步骤 2.3：创建 Express 应用入口

```javascript
// server/app.js
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes/index');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
```

### 步骤 2.4：提交

```bash
git add server/
git commit -m "feat: add Express app skeleton with auth and error middleware"
```

---

## 任务 3：用户服务 — 登录/注册、体力恢复、签到

**文件：**
- 创建: `server/services/userService.js`
- 创建: `server/controllers/authController.js`
- 修改: `server/routes/index.js`

### 步骤 3.1：创建 userService

```javascript
// server/services/userService.js
const { User } = require('../models');

const STAMINA_MAX = 10;
const STAMINA_RECOVER_MINUTES = 5;

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
  user.stamina = Math.min(STAMINA_MAX, user.stamina + 3);
  user.total_score += 10;
  await user.save();
  return user;
}

module.exports = { loginOrRegister, getUser, recoverStamina, dailySign };
```

### 步骤 3.2：创建 authController

```javascript
// server/controllers/authController.js
const userService = require('../services/userService');

async function login(req, res, next) {
  try {
    const { openId } = req.body;
    const user = await userService.loginOrRegister(openId);
    res.json({ token: openId, user });
  } catch (err) { next(err); }
}

async function getMe(req, res, next) {
  try {
    const user = await userService.getUser(req.openId);
    if (!user) return res.status(404).json({ error: 'not_found' });
    user = await userService.recoverStamina(user);
    res.json({ user });
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
    user = await userService.dailySign(user);
    res.json({ stamina: user.stamina, totalScore: user.total_score });
  } catch (err) { next(err); }
}

module.exports = { login, getMe, recoverStamina, dailySign };
```

### 步骤 3.3：创建路由文件

```javascript
// server/routes/index.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authCtrl = require('../controllers/authController');

router.post('/auth/login', authCtrl.login);
router.get('/user/me', auth, authCtrl.getMe);
router.post('/user/recover-stamina', auth, authCtrl.recoverStamina);
router.post('/user/daily-sign', auth, authCtrl.dailySign);

module.exports = router;
```

### 步骤 3.4：提交

```bash
git add server/
git commit -m "feat: add user auth, stamina recovery, daily sign services"
```

---

## 任务 4：关卡服务与种子数据

**文件：**
- 创建: `server/services/levelService.js`
- 创建: `server/controllers/levelController.js`
- 创建: `server/seeds/seedLevels.js`
- 修改: `server/routes/index.js`

### 步骤 4.1：创建 levelService

```javascript
// server/services/levelService.js
const { LevelConfig, UserProgress } = require('../models');

async function getLevelList() {
  return LevelConfig.findAll({
    attributes: ['level_id', 'difficulty', 'rows', 'cols', 'min_score'],
    order: [['level_id', 'ASC']],
  });
}

async function getLevelData(levelId, openId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404 });

  let progress = await UserProgress.findOne({ where: { user_id: openId, level_id: levelId } });
  if (!progress) {
    // 初始化空网格
    const gridState = [];
    for (let r = 0; r < config.rows; r++) {
      gridState[r] = new Array(config.cols).fill(null);
    }
    for (const cell of config.fixed_cells) {
      gridState[cell.row][cell.col] = cell.char;
    }
    progress = await UserProgress.create({
      user_id: openId,
      level_id: levelId,
      grid_state: gridState,
      used_fragments: [],
    });
  }

  // 计算剩余碎片：fragments - usedFragments
  const used = progress.used_fragments || [];
  const allFragments = [...config.fragments];
  const availableFragments = allFragments.filter(f => !used.includes(f.text));

  // 随机打散碎片顺序
  availableFragments.sort(() => Math.random() - 0.5);

  return {
    levelId: config.level_id,
    rows: config.rows,
    cols: config.cols,
    gridState: progress.grid_state,
    fragments: availableFragments,
    distractors: config.distractors || [],
  };
}

/**
 * 从 idioms 推导每个格子的正确答案
 * 返回 Map: "row,col" → char
 */
function buildAnswerMap(config) {
  const map = {};
  for (const idiom of config.idioms) {
    const chars = idiom.answer.split('');
    if (idiom.direction === 'horizontal') {
      for (let i = 0; i < chars.length; i++) {
        const key = `${idiom.row},${idiom.startCol + i}`;
        if (map[key] && map[key] !== chars[i]) {
          console.warn(`格子 ${key} 的答案冲突: ${map[key]} vs ${chars[i]}`);
        }
        map[key] = chars[i];
      }
    } else {
      for (let i = 0; i < chars.length; i++) {
        const key = `${idiom.startRow + i},${idiom.col}`;
        if (map[key] && map[key] !== chars[i]) {
          console.warn(`格子 ${key} 的答案冲突: ${map[key]} vs ${chars[i]}`);
        }
        map[key] = chars[i];
      }
    }
  }
  return map;
}

module.exports = { getLevelList, getLevelData, buildAnswerMap };
```

### 步骤 4.2：创建 levelController

```javascript
// server/controllers/levelController.js
const levelService = require('../services/levelService');
const userService = require('../services/userService');

async function getLevelList(req, res, next) {
  try {
    const levels = await levelService.getLevelList();
    res.json({ levels });
  } catch (err) { next(err); }
}

async function getLevelData(req, res, next) {
  try {
    const levelId = parseInt(req.params.levelId);
    const user = await userService.recoverStamina(
      await userService.getUser(req.openId)
    );
    const data = await levelService.getLevelData(levelId, user.open_id);
    res.json({ ...data, stamina: user.stamina, totalScore: user.total_score });
  } catch (err) { next(err); }
}

module.exports = { getLevelList, getLevelData };
```

### 步骤 4.3：创建种子数据

```javascript
// server/seeds/seedLevels.js
const { sequelize, LevelConfig } = require('../models');

const levels = [
  {
    level_id: 1,
    rows: 3, cols: 3,
    difficulty: 'easy', min_score: 30,
    fixed_cells: [
      { row: 0, col: 0, char: '一' },
    ],
    idioms: [
      { direction: 'horizontal', row: 0, startCol: 0, endCol: 3, answer: '一心一意' },
      { direction: 'vertical', col: 0, startRow: 0, endRow: 3, answer: '一马当先' },
    ],
    fragments: [
      { text: '心', length: 1, positions: [[0,1]] },
      { text: '一', length: 1, positions: [[0,2]] },
      { text: '意', length: 1, positions: [[0,3]] },
      { text: '马', length: 1, positions: [[1,0]] },
      { text: '当', length: 1, positions: [[2,0]] },
      { text: '先', length: 1, positions: [[3,0]] },
    ],
    distractors: [{ text: '天', length: 1 }],
  },
  {
    level_id: 2,
    rows: 5, cols: 5,
    difficulty: 'easy', min_score: 50,
    fixed_cells: [
      { row: 0, col: 0, char: '欢' }, { row: 0, col: 1, char: '声' },
      { row: 2, col: 2, char: '如' }, { row: 3, col: 3, char: '贯' },
      { row: 4, col: 0, char: '交' }, { row: 4, col: 1, char: '头' },
    ],
    idioms: [
      { direction: 'horizontal', row: 0, startCol: 0, endCol: 3, answer: '欢声如雷' },
      { direction: 'horizontal', row: 4, startCol: 0, endCol: 3, answer: '交头接耳' },
      { direction: 'vertical', col: 2, startRow: 0, endRow: 4, answer: '如雷贯耳' },
    ],
    fragments: [
      { text: '雷', length: 1, positions: [[0,4]] },
      { text: '接', length: 1, positions: [[1,2]] },
      { text: '风', length: 1, positions: [[0,2]] },
      { text: '耳', length: 1, positions: [[4,4]] },
      { text: '动', length: 1, positions: [[4,3]] },
    ],
    distractors: [{ text: '天', length: 1 }, { text: '地', length: 1 }],
  },
  {
    level_id: 3,
    rows: 4, cols: 4,
    difficulty: 'medium', min_score: 60,
    fixed_cells: [
      { row: 0, col: 0, char: '花' },
      { row: 1, col: 3, char: '春' },
    ],
    idioms: [
      { direction: 'horizontal', row: 0, startCol: 0, endCol: 3, answer: '花好月圆' },
      { direction: 'horizontal', row: 1, startCol: 0, endCol: 3, answer: '春暖花开' },
      { direction: 'vertical', col: 3, startRow: 0, endRow: 4, answer: '花好月圆' },
    ],
    fragments: [
      { text: '好', length: 1, positions: [[0,1]] },
      { text: '月', length: 1, positions: [[0,2]] },
      { text: '圆', length: 1, positions: [[0,2]] },
      { text: '花', length: 1, positions: [[0,3]] },
      { text: '开', length: 1, positions: [[1,3]] },
    ],
    distractors: [{ text: '风', length: 1 }],
  },
];

async function seed() {
  await sequelize.sync({ force: true });
  for (const lvl of levels) {
    await LevelConfig.create(lvl);
  }
  console.log('Seed data inserted.');
  process.exit(0);
}

seed();
```

### 步骤 4.4：更新路由

在 `server/routes/index.js` 中添加：

```javascript
const levelCtrl = require('../controllers/levelController');

router.get('/levels', auth, levelCtrl.getLevelList);
router.get('/levels/:levelId', auth, levelCtrl.getLevelData);
```

### 步骤 4.5：添加 npm scripts

在 `server/package.json` 中：

```json
"scripts": {
  "start": "node app.js",
  "seed": "node seeds/seedLevels.js"
}
```

### 步骤 4.6：提交

```bash
git add server/
git commit -m "feat: add level data service, seed data, and level API"
```

---

## 任务 5：游戏核心服务 — 碎片校验、通关、提示

**文件：**
- 创建: `server/services/gameService.js`
- 创建: `server/services/hintService.js`
- 创建: `server/controllers/gameController.js`
- 创建: `server/controllers/hintController.js`
- 修改: `server/routes/index.js`

### 步骤 5.1：创建 gameService（核心校验逻辑）

```javascript
// server/services/gameService.js
const { LevelConfig, UserProgress, User } = require('../models');
const { buildAnswerMap } = require('./levelService');

async function placeFragment(levelId, fragmentText, positions, openId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404, code: 'level_not_found' });

  const progress = await UserProgress.findOne({
    where: { user_id: openId, level_id: levelId },
  });

  // 校验碎片未被使用
  if (progress.used_fragments.includes(fragmentText)) {
    throw Object.assign(new Error('碎片已使用'), { status: 400, code: 'already_used' });
  }

  // 校验碎片存在于关卡配置中
  const fragmentDef = config.fragments.find(f => f.text === fragmentText);
  if (!fragmentDef) {
    throw Object.assign(new Error('碎片不存在'), { status: 400, code: 'fragment_not_found' });
  }

  // 校验 positions 一致性（安全校验）
  const expectedPositions = fragmentDef.positions;
  if (positions.length !== expectedPositions.length) {
    throw Object.assign(new Error('位置不对'), { status: 400, code: 'position_mismatch' });
  }
  for (let i = 0; i < positions.length; i++) {
    if (positions[i][0] !== expectedPositions[i][0] || positions[i][1] !== expectedPositions[i][1]) {
      throw Object.assign(new Error('位置不对'), { status: 400, code: 'position_mismatch' });
    }
  }

  // 更新 gridState
  const gridState = progress.grid_state;
  const chars = fragmentText.split('');
  for (let i = 0; i < chars.length; i++) {
    const [r, c] = positions[i];
    gridState[r][c] = chars[i];
  }

  // 更新已使用碎片列表
  const usedFragments = [...progress.used_fragments, fragmentText];

  progress.grid_state = gridState;
  progress.used_fragments = usedFragments;
  progress.changed('grid_state', true);
  progress.changed('used_fragments', true);

  // 检查是否通关：所有 fragments 都已使用
  const allFragmentTexts = config.fragments.map(f => f.text);
  const isComplete = allFragmentTexts.every(t => usedFragments.includes(t));

  if (isComplete) {
    progress.completed = true;
    progress.completed_at = new Date();
  }
  await progress.save();

  // 用户积分 +5
  const user = await User.findOne({ where: { open_id: openId } });
  user.total_score += 5;
  if (isComplete) {
    user.total_score += config.min_score;
    user.stamina = Math.min(10, user.stamina + 2);
    user.current_level = Math.max(user.current_level, levelId + 1);
  }
  await user.save();

  return {
    success: true,
    gridState,
    remainingFragments: config.fragments.filter(f => !usedFragments.includes(f.text)),
    stamina: user.stamina,
    scoreDelta: isComplete ? 5 + config.min_score : 5,
    totalScore: user.total_score,
    isComplete,
  };
}

async function resetLevel(levelId, openId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404 });

  const gridState = [];
  for (let r = 0; r < config.rows; r++) {
    gridState[r] = new Array(config.cols).fill(null);
  }
  for (const cell of config.fixed_cells) {
    gridState[cell.row][cell.col] = cell.char;
  }

  // 删除旧进度
  await UserProgress.destroy({ where: { user_id: openId, level_id: levelId } });

  // 创建新进度
  await UserProgress.create({
    user_id: openId,
    level_id: levelId,
    grid_state: gridState,
    used_fragments: [],
  });

  // 扣体力
  const user = await User.findOne({ where: { open_id: openId } });
  user.stamina = Math.max(0, user.stamina - 1);
  await user.save();

  return { stamina: user.stamina };
}

module.exports = { placeFragment, resetLevel };
```

### 步骤 5.2：创建 hintService

```javascript
// server/services/hintService.js
const { LevelConfig, HintLog } = require('../models');
const { buildAnswerMap } = require('./levelService');

async function getHint(levelId, row, col, hintType, openId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404 });

  // 找到该格子的正确答案
  const answerMap = buildAnswerMap(config);
  const targetChar = answerMap[`${row},${col}`];
  if (!targetChar) {
    throw Object.assign(new Error('该格子不是空格'), { status: 400, code: 'not_empty' });
  }

  // 找到包含该字的未使用碎片
  const fragment = config.fragments.find(f => f.text.includes(targetChar));
  if (!fragment) {
    throw Object.assign(new Error('未找到对应碎片'), { status: 400, code: 'fragment_not_found' });
  }

  // 记录提示日志
  await HintLog.create({
    user_id: openId,
    level_id: levelId,
    row, col,
    hint_type: hintType,
  });

  return {
    fragmentText: fragment.text,
    positions: fragment.positions,
  };
}

module.exports = { getHint };
```

### 步骤 5.3：创建 gameController 和 hintController

```javascript
// server/controllers/gameController.js
const gameService = require('../services/gameService');
const userService = require('../services/userService');

async function placeFragment(req, res, next) {
  try {
    const { levelId, fragmentText, positions } = req.body;
    const user = await userService.getUser(req.openId);
    if (user.stamina <= 0) {
      return res.status(400).json({ success: false, error: 'no_stamina', message: '体力不足' });
    }
    const result = await gameService.placeFragment(levelId, fragmentText, positions, req.openId);
    res.json(result);
  } catch (err) {
    if (err.status === 400) {
      // 放置失败，扣 1 体力
      const user = await userService.getUser(req.openId);
      user.stamina = Math.max(0, user.stamina - 1);
      await user.save();
      return res.status(400).json({ success: false, error: err.code, message: err.message, stamina: user.stamina });
    }
    next(err);
  }
}

async function resetLevel(req, res, next) {
  try {
    const { levelId } = req.body;
    const result = await gameService.resetLevel(levelId, req.openId);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function shareReward(req, res, next) {
  try {
    const user = await userService.getUser(req.openId);
    user.stamina = Math.min(10, user.stamina + 1);
    await user.save();
    res.json({ stamina: user.stamina });
  } catch (err) { next(err); }
}

module.exports = { placeFragment, resetLevel, shareReward };
```

```javascript
// server/controllers/hintController.js
const hintService = require('../services/hintService');
const userService = require('../services/userService');

async function useHint(req, res, next) {
  try {
    const { levelId, row, col, hintType } = req.body;
    const result = await hintService.getHint(levelId, row, col, hintType, req.openId);

    // 扣 10 积分
    const user = await userService.getUser(req.openId);
    user.total_score = Math.max(0, user.total_score - 10);
    await user.save();

    res.json({ ...result, scoreDelta: -10, totalScore: user.total_score });
  } catch (err) { next(err); }
}

module.exports = { useHint };
```

### 步骤 5.4：更新路由

在 `server/routes/index.js` 中添加：

```javascript
const gameCtrl = require('../controllers/gameController');
const hintCtrl = require('../controllers/hintController');

router.post('/game/place-fragment', auth, gameCtrl.placeFragment);
router.post('/game/hint', auth, hintCtrl.useHint);
router.post('/game/reset', auth, gameCtrl.resetLevel);
router.post('/game/share-reward', auth, gameCtrl.shareReward);
```

### 步骤 5.5：提交

```bash
git add server/
git commit -m "feat: add game core services — place, validate, hint, reset"
```

---

## 任务 6：编辑器与排行榜服务

**文件：**
- 创建: `server/controllers/editorController.js`
- 创建: `server/controllers/leaderboardController.js`
- 创建: `server/services/leaderboardService.js`
- 修改: `server/routes/index.js`

### 步骤 6.1：创建 editorController

```javascript
// server/controllers/editorController.js
const { LevelConfig } = require('../models');

async function save(req, res, next) {
  try {
    const data = req.body;
    const [config] = await LevelConfig.upsert({
      level_id: data.levelId,
      rows: data.rows,
      cols: data.cols,
      fixed_cells: data.fixedCells,
      idioms: data.idioms,
      fragments: data.fragments,
      distractors: data.distractors || [],
      difficulty: data.difficulty || 'easy',
      min_score: data.minScore || 50,
    });
    res.json({ success: true, levelId: config.level_id });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const levelId = parseInt(req.params.levelId);
    await LevelConfig.destroy({ where: { level_id: levelId } });
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { save, remove };
```

### 步骤 6.2：创建 leaderboardService 和 leaderboardController

```javascript
// server/services/leaderboardService.js
const { Leaderboard, User } = require('../models');

async function getRankings() {
  const today = new Date().toISOString().slice(0, 10);

  // 检查今日排行榜是否已存在
  let board = await Leaderboard.findOne({ where: { date: today } });
  if (!board) {
    // 实时计算前 100 名
    const users = await User.findAll({
      order: [['total_score', 'DESC']],
      limit: 100,
    });
    const rankings = users.map((u, i) => ({
      rank: i + 1,
      nickName: u.nick_name,
      avatarUrl: u.avatar_url,
      level: u.current_level,
      totalScore: u.total_score,
    }));
    board = await Leaderboard.create({ date: today, rankings });
  }
  return board.rankings;
}

module.exports = { getRankings };
```

```javascript
// server/controllers/leaderboardController.js
const leaderboardService = require('../services/leaderboardService');

async function getLeaderboard(req, res, next) {
  try {
    const rankings = await leaderboardService.getRankings();
    res.json({ rankings });
  } catch (err) { next(err); }
}

module.exports = { getLeaderboard };
```

### 步骤 6.3：更新路由

```javascript
const editorCtrl = require('../controllers/editorController');
const lbCtrl = require('../controllers/leaderboardController');

router.post('/editor/save', auth, editorCtrl.save);
router.delete('/editor/:levelId', auth, editorCtrl.remove);
router.get('/leaderboard', auth, lbCtrl.getLeaderboard);
```

### 步骤 6.4：提交

```bash
git add server/
git commit -m "feat: add editor save/delete and leaderboard API"
```

---

## 任务 7：前端基础设施 — Canvas 主循环与全局状态改写

**文件：**
- 创建: `js/api/index.js`
- 重写: `js/databus.js`
- 重写: `js/main.js`

### 步骤 7.1：创建 API 客户端

```javascript
// js/api/index.js
const BASE_URL = 'http://localhost:3000/api';

let token = null;

function setToken(t) { token = t; }
function getToken() { return token; }

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method,
      header: { 'Authorization': 'Bearer ' + (token || 'anonymous'), 'Content-Type': 'application/json' },
      data: data || {},
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail(err) { reject(err); },
    });
  });
}

export const api = {
  login: (openId) => request('POST', '/auth/login', { openId }),
  getMe: () => request('GET', '/user/me'),
  recoverStamina: () => request('POST', '/user/recover-stamina'),
  dailySign: () => request('POST', '/user/daily-sign'),
  getLevels: () => request('GET', '/levels'),
  getLevelData: (levelId) => request('GET', '/levels/' + levelId),
  placeFragment: (levelId, fragmentText, positions) =>
    request('POST', '/game/place-fragment', { levelId, fragmentText, positions }),
  useHint: (levelId, row, col, hintType) =>
    request('POST', '/game/hint', { levelId, row, col, hintType }),
  resetLevel: (levelId) =>
    request('POST', '/game/reset', { levelId }),
  shareReward: () => request('POST', '/game/share-reward'),
  saveLevel: (data) => request('POST', '/editor/save', data),
  deleteLevel: (levelId) => request('DELETE', '/editor/' + levelId),
  getLeaderboard: () => request('GET', '/leaderboard'),
  setToken,
  getToken,
};
```

### 步骤 7.2：重写 databus.js

```javascript
// js/databus.js
import './render';

let instance;

export const ScreenState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  EDITOR: 'EDITOR',
};

export const PlaceState = {
  IDLE: 'IDLE',
  SELECTING_CELLS: 'SELECTING_CELLS', // 多字碎片等待选格
};

export default class DataBus {
  // 屏幕状态
  screen = ScreenState.MENU;

  // 用户信息
  userId = '';
  stamina = 10;
  totalScore = 0;
  currentLevel = 1;

  // 关卡数据
  levelId = 1;
  rows = 0;
  cols = 0;
  gridState = [];         // 二维数组
  fragments = [];         // { text, length, positions }[]
  distractors = [];
  usedFragments = [];
  levels = [];            // 可选关卡列表

  // 放置状态
  placeState = PlaceState.IDLE;
  selectedFragment = null;  // 当前选中的碎片 { text, length }
  firstCell = null;         // 多字碎片已选的第一个格子 { row, col }

  // UI 提示
  toastMessage = '';
  toastTimer = 0;

  // 编辑器状态
  isEditor = false;

  constructor() {
    if (instance) return instance;
    instance = this;
  }

  showToast(msg, duration = 2000) {
    this.toastMessage = msg;
    this.toastTimer = duration;
  }

  reset() {
    this.placeState = PlaceState.IDLE;
    this.selectedFragment = null;
    this.firstCell = null;
  }
}
```

### 步骤 7.3：重写 main.js

```javascript
// js/main.js
import DataBus, { ScreenState } from './databus';
import { Grid } from './game/Grid';
import { FragmentBar } from './game/FragmentBar';
import { HUD } from './ui/HUD';
import { MenuScreen } from './game/MenuScreen';
import { Editor } from './game/Editor';
import { api } from './api/index';
import { Dialog } from './ui/Dialog';
import { Toast } from './ui/Toast';

const ctx = canvas.getContext('2d');
GameGlobal.databus = new DataBus();

export default class Main {
  constructor() {
    this.grid = new Grid();
    this.fragmentBar = new FragmentBar();
    this.hud = new HUD();
    this.menu = new MenuScreen();
    this.editor = new Editor();
    this.dialog = new Dialog();
    this.toast = new Toast();
    this.staminaTimer = 0;

    this.initTouchHandler();
    this.loop();
  }

  initTouchHandler() {
    wx.onTouchStart((e) => {
      const touch = e.touches[0];
      this.handleTouch(touch.x, touch.y);
    });
  }

  handleTouch(x, y) {
    const db = GameGlobal.databus;

    // Toast 不拦截触摸

    if (db.screen === ScreenState.MENU) {
      this.menu.onTouch(x, y);
      return;
    }

    if (db.screen === ScreenState.EDITOR) {
      this.editor.onTouch(x, y);
      return;
    }

    // 游戏中
    if (this.hud.hitTest(x, y)) {
      this.hud.onTouch(x, y);
      return;
    }
    if (this.fragmentBar.hitTest(x, y)) {
      this.fragmentBar.onTouch(x, y);
      return;
    }
    if (this.grid.hitTest(x, y)) {
      this.grid.onTouch(x, y);
      return;
    }
  }

  update(dt) {
    const db = GameGlobal.databus;

    // 体力轮询（每 30 秒）
    this.staminaTimer += dt;
    if (this.staminaTimer >= 30000 && db.screen === ScreenState.PLAYING) {
      this.staminaTimer = 0;
      api.recoverStamina().then(res => { db.stamina = res.stamina; });
    }

    // Toast 计时
    if (db.toastTimer > 0) {
      db.toastTimer -= dt;
      if (db.toastTimer <= 0) db.toastMessage = '';
    }
  }

  render() {
    const db = GameGlobal.databus;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (db.screen === ScreenState.MENU) {
      this.menu.draw(ctx);
    } else if (db.screen === ScreenState.EDITOR) {
      this.editor.draw(ctx);
    } else {
      this.grid.draw(ctx);
      this.fragmentBar.draw(ctx);
      this.hud.draw(ctx);
    }

    this.toast.draw(ctx);
    this.dialog.draw(ctx);
  }

  loop() {
    this.update(1000 / 60);
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }
}
```

### 步骤 7.4：修改 game.js 入口

当前 `game.js` 已经正确引用 `js/main.js`，无需修改。

### 步骤 7.5：提交

```bash
git add js/
git commit -m "feat: rewrite frontend framework — Canvas main loop, databus, API client"
```

---

## 任务 8：UI 基础组件 — Button、Toast、Dialog、HUD

**文件：**
- 创建: `js/ui/Button.js`
- 创建: `js/ui/Toast.js`
- 创建: `js/ui/Dialog.js`
- 创建: `js/ui/HUD.js`

### 步骤 8.1：创建 Button 基类

```javascript
// js/ui/Button.js
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
    ctx.fillStyle = this.enabled ? this.color : '#cccccc';
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(this.x + r, this.y);
    ctx.lineTo(this.x + this.width - r, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + r);
    ctx.lineTo(this.x + this.width, this.y + this.height - r);
    ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - r, this.y + this.height);
    ctx.lineTo(this.x + r, this.y + this.height);
    ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - r);
    ctx.lineTo(this.x, this.y + r);
    ctx.quadraticCurveTo(this.x, this.y, this.x + r, this.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);
  }

  hitTest(px, py) {
    return this.enabled &&
      px >= this.x && px <= this.x + this.width &&
      py >= this.y && py <= this.y + this.height;
  }
}
```

### 步骤 8.2：创建 Toast

```javascript
// js/ui/Toast.js
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
```

### 步骤 8.3：创建 Dialog

```javascript
// js/ui/Dialog.js
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
    this.buttons = buttons.map((b, i) => {
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

    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 弹窗
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

    // 按钮
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
```

### 步骤 8.4：创建 HUD

```javascript
// js/ui/HUD.js
import { SCREEN_WIDTH } from '../render';
import { Button } from './Button';
import { api } from '../api/index';
import { ScreenState } from '../databus';

export class HUD {
  constructor() {
    this.yTop = 5;
    this.yBottom = SCREEN_WIDTH * 1.2;
    this.height = 40;

    const btnW = 70, btnH = 32;
    const gap = 8;
    const totalW = btnW * 3 + gap * 2;
    const startX = (SCREEN_WIDTH - totalW) / 2;

    this.hintBtn = new Button(startX, this.yBottom, btnW, btnH, '提示', '#e8a840');
    this.shuffleBtn = new Button(startX + btnW + gap, this.yBottom, btnW, btnH, '洗牌', '#6c9bd2');
    this.resetBtn = new Button(startX + (btnW + gap) * 2, this.yBottom, btnW, btnH, '重置', '#d94a4a');

    this.hintBtn.onClick = () => this.handleHint();
    this.shuffleBtn.onClick = () => this.handleShuffle();
    this.resetBtn.onClick = () => this.handleReset();

    this.allButtons = [this.hintBtn, this.shuffleBtn, this.resetBtn];
  }

  draw(ctx) {
    const db = GameGlobal.databus;

    // 顶栏背景
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SCREEN_WIDTH, 48);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(SCREEN_WIDTH, 48);
    ctx.stroke();

    // 关卡号
    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${db.levelId} 关`, 12, 26);

    // 体力
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e06060';
    ctx.fillText('❤️'.repeat(Math.max(0, db.stamina)), SCREEN_WIDTH - 60, 26);

    // 积分
    ctx.fillStyle = '#e8a840';
    ctx.fillText('⭐ ' + db.totalScore, SCREEN_WIDTH - 12, 26);

    // 底部按钮区
    const gap = 6;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, this.yBottom - gap, SCREEN_WIDTH, 50);
    ctx.strokeStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(0, this.yBottom - gap);
    ctx.lineTo(SCREEN_WIDTH, this.yBottom - gap);
    ctx.stroke();

    this.hintBtn.draw(ctx);
    this.shuffleBtn.draw(ctx);
    this.resetBtn.draw(ctx);
  }

  hitTest(px, py) {
    for (const b of this.allButtons) {
      if (b.hitTest(px, py)) return true;
    }
    return false;
  }

  onTouch(x, y) {
    for (const b of this.allButtons) {
      if (b.hitTest(x, y) && b.onClick) { b.onClick(); return; }
    }
  }

  handleHint() {
    const db = GameGlobal.databus;
    if (!db.selectedFragment && !db.firstCell) {
      db.showToast('请先点击一个空格再点提示');
      return;
    }
    const cell = db.firstCell || db.selectedFragment;
    if (!cell) return;
    api.useHint(db.levelId, cell.row, cell.col, 'highlight').then(res => {
      db.showToast('正确碎片: ' + res.fragmentText);
      db.totalScore = res.totalScore;
    }).catch(() => db.showToast('提示失败'));
  }

  handleShuffle() {
    const db = GameGlobal.databus;
    db.fragments.sort(() => Math.random() - 0.5);
    db.totalScore = Math.max(0, db.totalScore - 5);
    db.showToast('已重新排列碎片 (-5 分)');
  }

  handleReset() {
    const db = GameGlobal.databus;
    api.resetLevel(db.levelId).then(res => {
      db.stamina = res.stamina;
    });
    // 重新加载关卡
    api.getLevelData(db.levelId).then(data => {
      db.gridState = data.gridState;
      db.fragments = data.fragments;
      db.distractors = data.distractors;
      db.reset();
      db.showToast('关卡已重置');
    });
  }
}
```

### 步骤 8.5：提交

```bash
git add js/ui/
git commit -m "feat: add Canvas UI components — Button, Toast, Dialog, HUD"
```

---

## 任务 9：网格组件 Grid

**文件：**
- 创建: `js/game/Grid.js`

### 步骤 9.1：创建 Grid

```javascript
// js/game/Grid.js
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { PlaceState } from '../databus';
import { api } from '../api/index';

export class Grid {
  constructor() {
    this.cellSize = 52;
    this.gap = 4;
    this.offsetX = 0;
    this.offsetY = 0;

    this.highlightCell = null;   // 高亮的空格 { row, col }
  }

  getLayout() {
    const db = GameGlobal.databus;
    const totalW = db.cols * this.cellSize + (db.cols - 1) * this.gap;
    const totalH = db.rows * this.cellSize + (db.rows - 1) * this.gap;
    this.offsetX = (SCREEN_WIDTH - totalW) / 2;
    this.offsetY = 70;
    return { totalW, totalH, offsetX: this.offsetX, offsetY: this.offsetY };
  }

  cellCenter(row, col) {
    const { offsetX, offsetY } = this.getLayout();
    return {
      x: offsetX + col * (this.cellSize + this.gap) + this.cellSize / 2,
      y: offsetY + row * (this.cellSize + this.gap) + this.cellSize / 2,
    };
  }

  hitTest(px, py) {
    const db = GameGlobal.databus;
    const { offsetX, offsetY } = this.getLayout();
    for (let r = 0; r < db.rows; r++) {
      for (let c = 0; c < db.cols; c++) {
        const cx = offsetX + c * (this.cellSize + this.gap);
        const cy = offsetY + r * (this.cellSize + this.gap);
        if (px >= cx && px <= cx + this.cellSize &&
            py >= cy && py <= cy + this.cellSize) {
          return true;
        }
      }
    }
    return false;
  }

  getCellAt(px, py) {
    const db = GameGlobal.databus;
    const { offsetX, offsetY } = this.getLayout();
    for (let r = 0; r < db.rows; r++) {
      for (let c = 0; c < db.cols; c++) {
        const cx = offsetX + c * (this.cellSize + this.gap);
        const cy = offsetY + r * (this.cellSize + this.gap);
        if (px >= cx && px <= cx + this.cellSize &&
            py >= cy && py <= cy + this.cellSize) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  onTouch(x, y) {
    const db = GameGlobal.databus;
    const cell = this.getCellAt(x, y);
    if (!cell) return;

    // 编辑器模式下由 Editor 处理
    if (db.screen === 'EDITOR') return;

    const char = db.gridState[cell.row] && db.gridState[cell.row][cell.col];
    if (char) return; // 不可修改已填充的格子

    // 如果没有选中碎片，记录空格用于提示
    if (!db.selectedFragment && db.placeState === PlaceState.IDLE) {
      db.firstCell = cell;
      this.highlightCell = cell;
      return;
    }

    // 选中了碎片，尝试放置
    if (db.selectedFragment) {
      const frag = db.selectedFragment;

      if (frag.length === 1) {
        // 单字碎片直接放置
        this.placeFragment(frag, [cell]);
      } else if (frag.length === 2) {
        // 多字碎片：需要选两个格子
        if (db.placeState === PlaceState.IDLE) {
          db.firstCell = cell;
          db.placeState = PlaceState.SELECTING_CELLS;
          this.highlightCell = cell;
          db.showToast('请选择第二个连续的空格');
        } else {
          // 第二个格子
          const first = db.firstCell;
          const isAdjacent = (
            (first.row === cell.row && Math.abs(first.col - cell.col) === 1) ||
            (first.col === cell.col && Math.abs(first.row - cell.row) === 1)
          );
          if (!isAdjacent) {
            db.showToast('请选择连续的两个格子（同行或同列）');
            db.reset();
            this.highlightCell = null;
            return;
          }
          // 按顺序排列
          const positions = [first, cell].sort((a, b) => a.row - b.row || a.col - b.col);
          this.placeFragment(frag, positions);
        }
      }
    }
  }

  async placeFragment(frag, positions) {
    const db = GameGlobal.databus;
    api.placeFragment(db.levelId, frag.text, positions.map(p => [p.row, p.col]))
      .then(res => {
        db.gridState = res.gridState;
        db.fragments = db.fragments.filter(f => f.text !== frag.text);
        db.usedFragments.push(frag.text);
        db.stamina = res.stamina;
        db.totalScore = res.totalScore;
        db.reset();
        this.highlightCell = null;
        if (res.isComplete) {
          // 通知 main 弹出通关弹窗
          GameGlobal.main && GameGlobal.main.dialog.show(
            '恭喜通关！',
            '获得 ' + res.scoreDelta + ' 积分',
            [{ label: '下一关', color: '#4a90d9', onClick: () => { /* TODO */ } },
             { label: '返回', color: '#999', onClick: () => { /* TODO */ } }]
          );
        }
      })
      .catch(err => {
        db.stamina = err.stamina !== undefined ? err.stamina : db.stamina;
        db.showToast(err.message || '位置不对');
        db.reset();
        this.highlightCell = null;
      });
  }

  draw(ctx) {
    const db = GameGlobal.databus;
    const { offsetX, offsetY } = this.getLayout();

    for (let r = 0; r < db.rows; r++) {
      for (let c = 0; c < db.cols; c++) {
        const cx = offsetX + c * (this.cellSize + this.gap);
        const cy = offsetY + r * (this.cellSize + this.gap);
        const char = db.gridState[r] && db.gridState[r][c];

        // 格子背景
        if (char) {
          ctx.fillStyle = '#d4e8d4'; // 有字格子
        } else {
          ctx.fillStyle = '#ffffff'; // 空格子
        }
        ctx.strokeStyle = '#b0b0b0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cr = 6;
        ctx.moveTo(cx + cr, cy);
        ctx.lineTo(cx + this.cellSize - cr, cy);
        ctx.quadraticCurveTo(cx + this.cellSize, cy, cx + this.cellSize, cy + cr);
        ctx.lineTo(cx + this.cellSize, cy + this.cellSize - cr);
        ctx.quadraticCurveTo(cx + this.cellSize, cy + this.cellSize, cx + this.cellSize - cr, cy + this.cellSize);
        ctx.lineTo(cx + cr, cy + this.cellSize);
        ctx.quadraticCurveTo(cx, cy + this.cellSize, cx, cy + this.cellSize - cr);
        ctx.lineTo(cx, cy + cr);
        ctx.quadraticCurveTo(cx, cy, cx + cr, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 高亮当前选中的格子
        if (this.highlightCell && this.highlightCell.row === r && this.highlightCell.col === c) {
          ctx.strokeStyle = '#ff6600';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx + cr, cy);
          ctx.lineTo(cx + this.cellSize - cr, cy);
          ctx.quadraticCurveTo(cx + this.cellSize, cy, cx + this.cellSize, cy + cr);
          ctx.lineTo(cx + this.cellSize, cy + this.cellSize - cr);
          ctx.quadraticCurveTo(cx + this.cellSize, cy + this.cellSize, cx + this.cellSize - cr, cy + this.cellSize);
          ctx.lineTo(cx + cr, cy + this.cellSize);
          ctx.quadraticCurveTo(cx, cy + this.cellSize, cx, cy + this.cellSize - cr);
          ctx.lineTo(cx, cy + cr);
          ctx.quadraticCurveTo(cx, cy, cx + cr, cy);
          ctx.closePath();
          ctx.stroke();
        }

        // 文字
        if (char) {
          ctx.fillStyle = '#333';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(char, cx + this.cellSize / 2, cy + this.cellSize / 2);
        }
      }
    }
  }
}
```

### 步骤 9.2：提交

```bash
git add js/game/Grid.js
git commit -m "feat: add Grid component with cell rendering and touch handling"
```

---

## 任务 10：碎片区组件 FragmentBar

**文件：**
- 创建: `js/game/FragmentBar.js`

### 步骤 10.1：创建 FragmentBar

```javascript
// js/game/FragmentBar.js
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
    // 放在网格下方
    const gridBottom = 70 + 6 * (52 + 4); // 预估
    this.y = Math.max(gridBottom + 10, SCREEN_WIDTH * 0.95);
  }

  hitTest(px, py) {
    this.getLayout();
    const db = GameGlobal.databus;
    const allItems = [...db.fragments, ...db.distractors.map(d => ({ text: d.text, length: d.length, positions: null }))];
    let cx = this.paddingX;
    for (const frag of allItems) {
      const w = frag.length === 2 ? this.itemW * 2 + this.gap : this.itemW;
      if (px >= cx && px <= cx + w && py >= this.y && py <= this.y + this.itemH) {
        return true;
      }
      cx += w + this.gap;
      if (cx + this.itemW > SCREEN_WIDTH - this.paddingX) {
        cx = this.paddingX;
        // 简单处理：不换行，横向滚动
      }
    }
    return false;
  }

  getFragmentAt(px, py) {
    const db = GameGlobal.databus;
    const allItems = [...db.fragments, ...db.distractors.map(d => ({ text: d.text, length: d.length, positions: null }))];
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
      // 干扰碎片
      db.showToast('此碎片不属于任何位置');
      return;
    }

    // 切换选中
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

      // 换行
      if (cx + w > SCREEN_WIDTH - this.paddingX) {
        // 简单处理：超出的不绘制（一期）
        break;
      }

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
```

### 步骤 10.2：提交

```bash
git add js/game/FragmentBar.js
git commit -m "feat: add FragmentBar component with fragment rendering and selection"
```

---

## 任务 11：选关界面 MenuScreen

**文件：**
- 创建: `js/game/MenuScreen.js`

### 步骤 11.1：创建 MenuScreen

```javascript
// js/game/MenuScreen.js
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
      const btn = new Button(x, y, btnW, btnH, '第' + lvl.level_id + '关',
        lvl.level_id <= db.currentLevel ? '#4a90d9' : '#cccccc');
      btn.enabled = lvl.level_id <= db.currentLevel;
      btn.onClick = () => this.startLevel(lvl.level_id);
      this.levelBtns.push(btn);
    });

    // 排行榜按钮
    this.rankBtn = new Button(SCREEN_WIDTH / 2 - 50, this.startY + 5 * (btnH + gap),
      100, 40, '排行榜', '#e8a840');
    this.rankBtn.onClick = () => this.showRanking();
  }

  startLevel(levelId) {
    const db = GameGlobal.databus;
    db.levelId = levelId;
    api.getLevelData(levelId).then(data => {
      db.rows = data.rows;
      db.cols = data.cols;
      db.gridState = data.gridState;
      db.fragments = data.fragments;
      db.distractors = data.distractors;
      db.stamina = data.stamina;
      db.totalScore = data.totalScore;
      db.reset();
      db.screen = ScreenState.PLAYING;

      // 检测编辑器入口
      this.editorTapCount = 0;
    }).catch(() => db.showToast('加载关卡失败'));
  }

  showRanking() {
    api.getLeaderboard().then(data => {
      const msg = data.rankings.slice(0, 10).map(
        r => r.rank + '. ' + r.nickName + '  ' + r.totalScore + '分'
      ).join('\n');
      GameGlobal.databus.showToast(msg);
    }).catch(() => {});
  }

  onTouch(x, y) {
    const db = GameGlobal.databus;

    // 检测编辑器入口：连续点击标题 5 次
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
    // 标题
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('成语拼拼乐', SCREEN_WIDTH / 2, 60);

    // 关卡按钮
    this.levelBtns.forEach(b => b.draw(ctx));
    if (this.rankBtn) this.rankBtn.draw(ctx);
  }
}
```

### 步骤 11.2：提交

```bash
git add js/game/MenuScreen.js
git commit -m "feat: add MenuScreen with level select and leaderboard entry"
```

---

## 任务 12：关卡编辑器 Editor

**文件：**
- 创建: `js/game/Editor.js`

### 步骤 12.1：创建 Editor

```javascript
// js/game/Editor.js
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { ScreenState } from '../databus';
import { api } from '../api/index';
import { Button } from '../ui/Button';

export class Editor {
  constructor() {
    this.rows = 5;
    this.cols = 5;
    this.cellSize = 40;
    this.gap = 3;
    this.fixedCells = [];   // [{row,col,char}]
    this.idioms = [];       // [{direction,row/col,start,end,answer}]
    this.editMode = 'none'; // 'none' | 'setFixed' | 'addIdiom'

    this.doneBtn = new Button(SCREEN_WIDTH - 70, 8, 60, 32, '保存', '#4a90d9');
    this.doneBtn.onClick = () => this.save();
    this.backBtn = new Button(8, 8, 50, 32, '返回', '#999');
    this.backBtn.onClick = () => {
      GameGlobal.databus.screen = ScreenState.MENU;
    };
  }

  getOffset() {
    const totalW = this.cols * this.cellSize + (this.cols - 1) * this.gap;
    return {
      x: (SCREEN_WIDTH - totalW) / 2,
      y: 70,
    };
  }

  getCell(px, py) {
    const off = this.getOffset();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cx = off.x + c * (this.cellSize + this.gap);
        const cy = off.y + r * (this.cellSize + this.gap);
        if (px >= cx && px <= cx + this.cellSize &&
            py >= cy && py <= cy + this.cellSize) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  onTouch(x, y) {
    // 按钮
    if (this.backBtn.hitTest(x, y)) { this.backBtn.onClick(); return; }
    if (this.doneBtn.hitTest(x, y)) { this.doneBtn.onClick(); return; }

    const cell = this.getCell(x, y);
    if (!cell) return;

    // 切换固定字
    const exist = this.fixedCells.findIndex(f => f.row === cell.row && f.col === cell.col);
    if (exist >= 0) {
      this.fixedCells.splice(exist, 1);
    } else {
      this.fixedCells.push({ row: cell.row, col: cell.col, char: '字' });
    }
  }

  save() {
    // 自动从 fixedCells 反推碎片：每个空格生成一个单字碎片
    const fragments = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const isFixed = this.fixedCells.some(f => f.row === r && f.col === c);
        if (!isFixed) {
          fragments.push({ text: '?', length: 1, positions: [[r, c]] });
        }
      }
    }
    const data = {
      levelId: Date.now() % 10000,
      rows: this.rows,
      cols: this.cols,
      fixedCells: this.fixedCells,
      idioms: this.idioms,
      fragments,
      distractors: [],
      difficulty: 'easy',
      minScore: 50,
    };
    api.saveLevel(data).then(() => {
      GameGlobal.databus.showToast('关卡保存成功');
    }).catch(() => GameGlobal.databus.showToast('保存失败'));
  }

  draw(ctx) {
    const off = this.getOffset();

    // 顶栏
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SCREEN_WIDTH, 48);
    this.backBtn.draw(ctx);
    this.doneBtn.draw(ctx);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('关卡编辑器', SCREEN_WIDTH / 2, 26);

    // 网格
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cx = off.x + c * (this.cellSize + this.gap);
        const cy = off.y + r * (this.cellSize + this.gap);

        const isFixed = this.fixedCells.some(f => f.row === r && f.col === c);
        ctx.fillStyle = isFixed ? '#d4e8d4' : '#ffffff';
        ctx.strokeStyle = '#b0b0b0';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, this.cellSize, this.cellSize);
        ctx.fillRect(cx, cy, this.cellSize, this.cellSize);
        ctx.strokeRect(cx, cy, this.cellSize, this.cellSize);

        if (isFixed) {
          const fc = this.fixedCells.find(f => f.row === r && f.col === c);
          ctx.fillStyle = '#333';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fc.char, cx + this.cellSize / 2, cy + this.cellSize / 2);
        }
      }
    }

    // 提示
    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击格子设置/取消固定字', SCREEN_WIDTH / 2, off.y + this.rows * (this.cellSize + this.gap) + 20);
  }
}
```

### 步骤 12.2：提交

```bash
git add js/game/Editor.js
git commit -m "feat: add basic level editor with grid and fixed cell placement"
```

---

## 任务 13：连线整合 — 初始化流程与完整交互

**文件：**
- 修改: `js/main.js` (添加初始化逻辑和 MenuScreen 集成)
- 修改: `game.js`

### 步骤 13.1：完善 main.js 初始化

在 `Main` 类的 `constructor` 末尾添加初始化流程，并注册 `GameGlobal.main`：

```javascript
// 在 constructor() 方法中的 loop() 调用前添加:
this.loop = this.loop.bind(this);
GameGlobal.main = this;
this.init();
```

添加 `init` 方法：

```javascript
async init() {
  const db = GameGlobal.databus;
  // 本地开发：生成一个随机 openId 模拟登录
  const openId = 'user_' + Math.random().toString(36).slice(2, 10);
  try {
    const loginRes = await api.login(openId);
    api.setToken(loginRes.token);
    db.userId = openId;
    db.stamina = loginRes.user.stamina;
    db.totalScore = loginRes.user.total_score;
    db.currentLevel = loginRes.user.current_level;
    db.screen = ScreenState.MENU;
    await this.menu.loadLevels();
  } catch (e) {
    db.showToast('连接服务器失败，请确认后端已启动');
  }
}
```

### 步骤 13.2：完善通关弹窗逻辑

修改 `js/game/Grid.js` 中的通关回调，使用 `GameGlobal.main.dialog`：

```javascript
// placeFragment 成功且 isComplete 时:
GameGlobal.main.dialog.show(
  '恭喜通关！',
  '获得 ' + res.scoreDelta + ' 积分，体力 +2',
  [
    {
      label: '下一关',
      color: '#4a90d9',
      onClick: () => {
        GameGlobal.main.dialog.hide();
        const nextLevel = db.levelId + 1;
        GameGlobal.main.menu.startLevel(nextLevel);
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
```

### 步骤 13.3：完善 main.js handleTouch 中的 Dialog 处理

在 `handleTouch` 方法开头添加：

```javascript
if (this.dialog.visible) {
  const btn = this.dialog.hitTest(x, y);
  if (btn && btn.onClick) { btn.onClick(); return; }
  return;
}
```

### 步骤 13.4：提交

```bash
git add js/
git commit -m "feat: wire up initialization flow, level complete dialog, and full interaction"
```

---

## 任务 14：运行测试与调试

### 步骤 14.1：启动后端

```bash
cd d:/aiprojects/cygame/server
# 确保 MySQL 已启动，数据库 pygame_dev 已创建
npm run seed
npm start
```

### 步骤 14.2：启动前端

在微信开发者工具中打开项目 `d:/aiprojects/cygame`，确认：
- 设置 → 代理 → 不校验合法域名（开发阶段）
- 编译运行

### 步骤 14.3：验证清单

- [ ] 启动界面显示关卡列表
- [ ] 点击关卡进入游戏，网格和碎片区正确渲染
- [ ] 点击碎片再点击空格，放置成功，碎片消失，格子填充
- [ ] 放置错误，提示"位置不对"，体力 -1
- [ ] 点击提示按钮，高亮正确碎片
- [ ] 点击洗牌，碎片重新排列
- [ ] 点击重置，关卡清空
- [ ] 通关弹出恭喜弹窗
- [ ] 连续点击标题 5 次进入编辑器
- [ ] 编辑器中设置固定字，保存关卡
- [ ] 退出重进，进度保持
- [ ] 体力每 30 秒尝试恢复

### 步骤 14.4：提交

```bash
git add -A
git commit -m "chore: final integration and testing notes"
```

---

## 计划总结

| 任务 | 内容 | 预估时间 |
|------|------|----------|
| T0 | 清理旧代码 | 5min |
| T1 | 数据库模型 | 15min |
| T2 | Express 骨架 | 10min |
| T3 | 用户服务 | 15min |
| T4 | 关卡服务 + 种子数据 | 15min |
| T5 | 游戏核心校验 | 20min |
| T6 | 编辑器 + 排行榜 | 15min |
| T7 | 前端框架 | 15min |
| T8 | UI 组件 | 20min |
| T9 | Grid | 20min |
| T10 | FragmentBar | 15min |
| T11 | MenuScreen | 15min |
| T12 | Editor | 15min |
| T13 | 连线整合 | 15min |
| T14 | 测试调试 | 15min |

**总计：约 3.5 小时纯编码时间**
