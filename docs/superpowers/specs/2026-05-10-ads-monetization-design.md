# 设计文档：广告系统、签到、新手引导、音效、滚动与UI优化

| 版本 | 日期 | 作者 | 变更 |
|------|------|------|------|
| V1.0 | 2026-05-10 | AI助手 | 初版 |
| V1.1 | 2026-05-11 | AI助手 | 新增菜单页滚动、游戏页统一滚动、HUD拆分、UI布局优化 |

## 1. 概述

为成语拼拼乐微信小游戏添加激励视频广告（Banner 广告为辅）、每日签到、新手引导和音效系统。所有新增功能采用独立模块，通过 DataBus 和现有组件通信。V1.1 新增菜单页滚动、游戏页统一滚动（体力+网格+碎片整体滚动）、HUD 组件拆分重构（固定头部/可滚动状态区/固定底部）及 UI 布局优化。

## 2. 模块一：广告管理器 (AdManager)

**文件：** `js/ads/AdManager.js`

### 2.1 功能
- 激励视频广告：看完整视频获取奖励（体力、提示次数、通关积分翻倍）
- Banner 广告：菜单页底部常驻展示，进入游戏时隐藏
- 广告加载状态管理

### 2.2 API 设计

```javascript
class AdManager {
  init()                    // 创建广告实例，绑定回调
  showRewarded(type, cb)    // 拉起激励视频，type: 'stamina'|'hint'|'double_score'
  showBanner()              // 显示 Banner（菜单页）
  hideBanner()              // 隐藏 Banner（进入游戏）
  destroy()                 // 销毁广告实例
}
```

### 2.3 奖励配置

| 奖励类型 | 数量 | 调用后端 | 触发场景 |
|----------|------|----------|----------|
| stamina | +3 体力 | `POST /user/recover-stamina` | HUD 体力不足时、菜单页"看广告得体力"按钮 |
| hint | +1 提示次数 | 前端直接加（DataBus） | HUD 提示不够时 |
| double_score | 通关积分 ×2 | `POST /user/double-score`（新增） | 通关弹窗"看广告翻倍积分" |

### 2.4 集成点
- **MenuScreen:**
  - `buildButtons()` 中新增"看广告 +3体力"按钮
  - 页面显示时调用 `AdManager.showBanner()`
- **HUD:**
  - 体力为 0 时弹出提示："体力不足，看广告恢复？"
  - 提示次数为 0 时同理
- **Grid:**
  - 通关后 Dialog 增加"看广告翻倍积分"按钮

### 2.5 广告单元 ID
广告单元 ID 需要在微信公众平台注册后获取，以下为占位配置：

```javascript
// 开发阶段使用测试 ID
const AD_UNITS = {
  rewarded: 'adunit-xxxxxxxx',  // 激励视频广告单元 ID
  banner:   'adunit-yyyyyyyy',  // Banner 广告单元 ID
};
```

> WeChat 测试广告单元 ID 格式：激励视频 `adunit-xxxxxxxxxxxxxxxx`，可在微信开发者工具中自动生成测试广告。

### 2.6 新增 API：`POST /user/double-score`
- **入参**：`{ scoreDelta }`
- **处理**：将 scoreDelta 加到用户 totalScore
- **返回**：`{ totalScore }`
- **用途**：通关后看广告翻倍积分时调用

---

## 3. 模块二：签到系统 (DailySign)

**文件：** `js/game/DailySign.js`

### 3.1 功能
- 7 天连续签到奖励
- 每日仅首次进入菜单时自动弹出
- Canvas 绘制签到面板
- 后端 API 已就绪：`POST /user/daily-sign`

### 3.2 UI 设计
- 横向 7 格签到条，显示本周每日状态
- 已签到 ✓（绿色）、今天是 🔵（金色边框）、未签 ○（灰色）
- 今日奖励高亮显示
- 签到按钮"签到"（已签时显示"已签到 ✓"并置灰）
- 签到后飘出星星动画，1 秒后自动关闭

### 3.3 奖励阶梯

| 连续天数 | 体力 | 积分 | 提示次数 |
|----------|------|------|----------|
| 第 1 天 | +1 | 0 | 0 |
| 第 2 天 | +1 | 0 | 0 |
| 第 3 天 | +1 | +5 | 0 |
| 第 4 天 | +1 | 0 | 0 |
| 第 5 天 | +1 | 0 | +1 |
| 第 6 天 | +2 | 0 | 0 |
| 第 7 天 | +3 | +20 | +1 |

### 3.4 数据流
1. `MenuScreen.loadLevels()` 调用 `/user/me`，返回 `todaySigned` 和 `signStreak` 字段
2. 未签到 → 创建 DailySign 实例 → `draw(ctx)` 弹出签到面板
3. 用户点签到 → 调用 `POST /user/daily-sign` → 服务端根据 streak 发放阶梯奖励 → 更新 DataBus → 播放动画 → 关闭
4. 已签到 → 菜单页右上角显示"今日已签到 ✓"

### 3.5 后端改动
- **User 模型**：新增 `last_sign_date` (DATE) 和 `sign_streak` (INT, 默认 0) 字段
- **userService.dailySign**：根据 sign_streak 发放阶梯奖励（奖励配置见 3.3），更新 last_sign_date 和 sign_streak
- **authController.getMe**：返回中增加 `todaySigned` 和 `signStreak` 字段

### 3.5 数据结构
```javascript
class DailySign {
  visible = false;
  todaySigned = false;
  streak = 0;           // 连续签到天数
  animTimer = 0;         // 签到动画计时器
  rewardLabels = [       // 每日奖励标签
    '体力+1', '体力+1', '体力+1\n积分+5', '体力+1',
    '体力+1\n提示+1', '体力+2', '体力+3\n积分+20\n提示+1'
  ];
}
```

---

## 4. 模块三：新手引导 (Tutorial)

**文件：** `js/game/Tutorial.js`

### 4.1 功能
- 首次进入游戏时触发，引导完成核心操作
- 5 步逐步引导，全屏半透明遮罩 + 目标区域高亮
- 每步可跳过，完成后持久化标记

### 4.2 引导步骤

```
Step 1: 网格介绍
  高亮区域：网格面板
  文字："这是成语填字网格，固定字已帮你填好"
  箭头：指向网格中央

Step 2: 碎片区介绍
  高亮区域：碎片区
  文字："从下方碎片区选择正确的字或词"
  箭头：指向碎片区

Step 3: 操作示范
  高亮区域：一个碎片 + 一个空格（闪烁提示）
  文字："点击碎片选中，再点击空格放入"
  等待玩家完成一次实际放置 → 自动进入下一步
  如果玩家跳过，直接进入下一步

Step 4: 辅助按钮
  高亮区域：底部三个按钮（提示/洗牌/重置）
  文字："提示、洗牌、重置帮你过关"

Step 5: 体力说明 + 完成
  高亮区域：体力显示区域
  文字："体力用完就不能操作了哦，可以通过签到和广告恢复"
  按钮："开始游戏"
```

### 4.3 实现细节
- 半透明遮罩：`ctx.fillStyle = 'rgba(0,0,0,0.6)'` 覆盖全屏
- 高亮区域：`ctx.clearRect` 挖洞，露出下方网格/碎片/按钮
- 引导文字在遮罩上方绘制，白色文字 + 半透明背景框
- 箭头用 Canvas 绘制三角形指向目标区域
- 右上角"跳过"按钮
- 完成标记存到 `wx.setStorageSync('tutorial_done', true)`

### 4.4 触发条件
- `Main.init()` 中检查 `wx.getStorageSync('tutorial_done')`
- 未完成 → 进入第一关时自动触发
- 仅在 `ScreenState.PLAYING` 状态下显示

---

## 5. 模块四：音效管理 (SoundManager)

**文件：** `js/audio/SoundManager.js`

### 5.1 功能
- 背景音乐（菜单页和游戏场景不同曲目）
- UI 音效（点击、放置成功/失败、通关、签到等）
- 全局静音开关，偏好持久化到 Storage

### 5.2 音效文件

| 文件名 | 用途 | 格式 | 推荐来源 |
|--------|------|------|----------|
| bgm_menu.mp3 | 菜单背景音乐 | MP3 128kbps | Pixabay "calm background" |
| bgm_game.mp3 | 游戏背景音乐 | MP3 128kbps | Pixabay "peaceful loop" |
| click.mp3 | 按钮点击 | MP3 < 50KB | Pixabay "click pop" |
| place_ok.mp3 | 碎片放置成功 | MP3 < 50KB | Pixabay "success ding" |
| place_fail.mp3 | 放置失败 | MP3 < 50KB | Pixabay "error buzz" |
| complete.mp3 | 通关 | MP3 < 200KB | Pixabay "fanfare win" |
| hint.mp3 | 使用提示 | MP3 < 50KB | Pixabay "bell chime" |
| sign.mp3 | 签到 | MP3 < 50KB | Pixabay "coin reward" |

> 文件放到 `audio/` 目录。开发阶段使用占位（未加载到文件时静默跳过）。

### 5.3 API 设计

```javascript
class SoundManager {
  init()             // 从 Storage 读取静音偏好
  playBgm(scene)     // 'menu' | 'game'
  stopBgm()          // 停止背景音乐
  playSfx(name)      // 播放音效: 'click'|'place_ok'|'place_fail'|'complete'|'hint'|'sign'
  toggleMute()       // 切换静音，持久化
  setMuted(bool)     
}
```

### 5.4 集成点

| 触发位置 | 音效 |
|----------|------|
| Button.onClick（所有按钮） | click |
| Grid.placeFragment 成功 | place_ok |
| Grid.placeFragment 失败 | place_fail |
| 通关弹窗 | complete |
| HUD.handleHint | hint |
| DailySign 签到成功 | sign |
| MenuScreen 显示 | playBgm('menu') |
| 进入游戏 | playBgm('game') |

### 5.5 音频上下文管理
- 背景音乐使用独立 `wx.createInnerAudioContext()`（循环播放）
- 音效复用单个 `wx.createInnerAudioContext()`（每次 play 前设置 src）
- 静音时 `volume = 0`，非静音时 `volume = 0.6`（背景音乐）/ `volume = 1.0`（音效）
- 微信小游戏中音频需用户交互后才能播放，利用首次 touch 事件激活

---

## 6. 数据总线扩展 (DataBus)

在 `js/databus.js` 中新增字段：

```javascript
// 广告 & 签到
hintCards = 0;          // 免费提示卡数量（看广告获得）
todaySigned = false;    // 今日是否已签到
signStreak = 0;         // 连续签到天数

// 音效
soundMuted = false;     // 静音状态

// 引导
tutorialDone = false;   // 引导是否完成
```

---

## 7. Main.js 集成

```javascript
// 新增导入
import { AdManager } from './ads/AdManager';
import { SoundManager } from './audio/SoundManager';
import { DailySign } from './game/DailySign';
import { Tutorial } from './game/Tutorial';

class Main {
  constructor() {
    // ... 现有初始化
    this.adManager = new AdManager();
    this.soundManager = new SoundManager();
    this.dailySign = new DailySign();
    this.tutorial = new Tutorial();
    
    this.adManager.init();
    this.soundManager.init();
    this.tutorialDone = wx.getStorageSync('tutorial_done') || false;
  }
  
  handleTouch(x, y) {
    // 优先处理：引导遮罩拦截
    if (this.tutorial.active) {
      this.tutorial.onTouch(x, y);
      return;
    }
    // 签到面板拦截
    if (this.dailySign.visible) {
      this.dailySign.onTouch(x, y);
      return;
    }
    // ... 现有逻辑
  }
  
  render() {
    // ... 现有渲染
    this.tutorial.draw(ctx);        // 在 HUD/grid 之上
    this.dailySign.draw(ctx);       // 在菜单页之上
  }
}
```

---

## 8. 静音按钮 UI

在菜单页和游戏 HUD 中添加小型静音切换按钮：
- 菜单页：右上角，紧邻标题
- 游戏页：Header 返回按钮右侧
- 图标：🔊（有声音）/ 🔇（静音）
- 点击 → `soundManager.toggleMute()`

---

## 9. 菜单页滚动 (MenuScreen Scroll)

**文件：** `js/game/MenuScreen.js`

### 9.1 功能
- 当关卡按钮 + 底部控制按钮（排行榜、学习、编辑器、广告等）总高度超出屏幕时，菜单页内容区域可纵向滚动
- 触摸拖动滚动 + 惯性动画，8px 拖动阈值区分点击与滚动
- 右侧滚动条指示当前位置

### 9.2 实现细节
- `buildButtons()` 计算 `contentHeight` 和 `maxScrollY`（contentHeight - 可视区域高度）
- `draw(ctx)` 渲染流程：背景 → 裁剪区域 → 内容 `translate(0, -scrollY)` → 恢复 → 固定静音按钮 → 滚动条
- 触摸事件：`onTouchStart` 记录起始位置，`onTouchMove` 检测 8px 阈值后开始滚动，`onTouchEnd` 判断点击（无拖动）或启动惯性动画
- 翻页时重置 `scrollY = 0`
- 惯性动画使用 `requestAnimationFrame` + 衰减系数 `0.92`，递增 ID 防止动画冲突

---

## 10. 游戏页统一滚动 (Unified Game Scroll)

**文件：** `js/main.js`

### 10.1 功能
- 游戏页（PLAYING 屏幕）中 **体力状态区 + 网格 + 碎片区** 作为一个整体可纵向滚动
- 页面顶部 Header（返回、关卡标题、分数、静音按钮）固定不滚动
- 页面底部操作栏（提示、洗牌、重置）固定不滚动
- 内容超出可视区域时右侧显示滚动条

### 10.2 滚动区域
```
┌─────────────────────┐
│  Header (固定)      │  ← hud.headerH
├─────────────────────┤
│  体力 / 进度 (滚动) │  ← 从此处开始可滚动
│  网格区域   (滚动)  │
│  碎片区域   (滚动)  │
├─────────────────────┤
│  提示/洗牌/重置(固定)│ ← hud.yBottom - 8
└─────────────────────┘
```

### 10.3 实现细节
- `gameScrollY`：Main 实例属性，控制整体垂直滚动偏移
- `_gameUpdateScrollMetrics()`：计算 `_gameContentH`（碎片区底部 Y）和 `_gameMaxScrollY`（内容高度 - 可视区域高度）
- `_renderGame(ctx)` 渲染流程：
  1. `hud.getLayout()` 计算布局参数
  2. 检测关卡切换（`_lastLevelId !== db.levelId`）→ 重置 `gameScrollY = 0`
  3. 调用 `_gameUpdateScrollMetrics()` 更新滚动指标
  4. `hud.drawHeader(ctx)` — 固定头部（不随 scroll 偏移）
  5. 裁剪区域 `[headerH, yBottom-8]` → `ctx.translate(0, -gameScrollY)` → 绘制 `hud.drawStatus(ctx)` + `grid.draw(ctx)` + `fragmentBar.draw(ctx)` → `ctx.restore()`
  6. `hud.drawBottom(ctx)` — 固定底部操作栏
  7. 必要时绘制滚动条
- 触摸事件统一管理：
  - `_isInGameScrollArea(x, y)`：判断触摸点是否在可滚动区域内
  - `_gameOnTouchStart/Move/End`：处理拖动滚动 + 惯性，非拖动时路由点击到 grid/fragmentBar（Y 坐标需加回 scrollY）
  - 引导激活期间阻止滚动区域触摸
- 惯性滚动：衰减系数 `0.92`，递增 ID 防止动画冲突，速度阈值 `< 0.05` 或到达边界时停止
- 滚动条渲染：thumb 高度 = trackH × (viewportHeight / contentHeight)，最小 32px

### 10.4 FragmentBar 简化
**文件：** `js/game/FragmentBar.js`

FragmentBar 移除了所有独立滚动逻辑（`scrollY`、`maxScrollY`、`_dragging`、`_inertiaId` 等），恢复为纯渲染+点击检测组件。新增 `getBottomY()` 方法供 Main 计算总内容高度。

---

## 11. HUD 组件拆分重构

**文件：** `js/ui/HUD.js`

### 11.1 拆分策略
将原单一 `draw(ctx)` 方法拆分为三个独立绘制方法：

| 方法 | 绘制内容 | 定位 | 滚动 |
|------|---------|------|------|
| `drawHeader(ctx)` | 返回按钮、关卡标题、总分、静音按钮 | 屏幕顶部，h=50px | 固定 |
| `drawStatus(ctx)` | 体力心形、剩余空格、进度条 | headerH ~ headerH+statusH | 随内容滚动 |
| `drawBottom(ctx)` | 提示/洗牌/重置按钮 + 背景栏 | 屏幕底部 | 固定 |

### 11.2 布局优化
- `statusH`：56 → 72px（两行文字 + 进度条 + padding）
- 进度条宽度：动态计算 `Math.min(SCREEN_WIDTH - padX * 2, 240)` 替代固定 `100px`
- 按钮栏背景：白色半透明 `rgba(255,255,255,0.95)` + 顶部分割线
- `_drawRoundedBar()` 使用 `arcTo` 绘制圆角条，替换 `quadraticCurve`
- 新增 `hitTestHeader()` / `hitTestBottom()` 方法支持分区域碰撞检测
- `headerButtons` / `bottomButtons` 数组分组管理

### 11.3 Grid 动态 offsetY 适配
**文件：** `js/game/Grid.js`

`getLayout()` 中的 `offsetY` 改为动态计算，适应 HUD 尺寸变化：
```javascript
const headerH = hud ? hud.headerH : 50;
const statusH = hud ? hud.statusH : 72;
this.offsetY = headerH + statusH + marginTop + panelPad;
```

---

## 12. 新手引导滚动适配

**文件：** `js/game/Tutorial.js`

### 12.1 高亮区域偏移修正
`_getHighlightRect()` 中动态计算高亮区域时，受滚动影响的元素（grid、fragments、stamina）需减去当前游戏滚动偏移 `main.gameScrollY`，不受滚动影响的元素（buttons 固定底部、demo 屏幕中部）保持原坐标。

### 12.2 文本位置优化
引导文字框根据高亮区域位置动态调整：高亮在屏幕上三分之一时文字显示在下方，高亮在屏幕下三分之一时文字显示在上方，避免文字框溢出屏幕边界。

### 12.3 步骤 4 遮罩修正
Step 4（辅助按钮高亮）的 `clearRect` x 起点从 `hud.hintBtn.x - 8` 修正为 `0`，确保遮罩覆盖整个底部按钮区域。

---

## 13. 更新后的文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `js/ads/AdManager.js` | 广告管理器 |
| 新增 | `js/audio/SoundManager.js` | 音效管理器 |
| 新增 | `js/game/DailySign.js` | 签到面板 |
| 新增 | `js/game/Tutorial.js` | 新手引导 |
| 新增 | `audio/` 目录 | 音效文件（用户自行下载放入） |
| 修改 | `js/databus.js` | 新增 hintCards, todaySigned, signStreak, soundMuted, tutorialDone |
| 修改 | `js/main.js` | 集成 4 个新模块、统一游戏滚动（体力+网格+碎片整体滚动）、触摸路由重构、惯性物理、GameScroll 状态管理 |
| 修改 | `js/game/MenuScreen.js` | 看广告按钮、静音按钮、每日签到入口、**触摸拖动滚动 + 惯性 + 滚动条**、翻页重置滚动位置 |
| 修改 | `js/ui/HUD.js` | 体力不足广告入口、提示不足广告入口、静音按钮、**拆分为 drawHeader/drawStatus/drawBottom**、状态区域扩大至 72px、动态进度条宽度、分组按钮管理 |
| 修改 | `js/game/Grid.js` | 通关后"看广告翻倍积分"按钮、放置成功/失败音效、**动态 offsetY 适配 HUD 尺寸** |
| 修改 | `js/game/FragmentBar.js` | **移除独立滚动逻辑**（交由 Main 统一管理）、新增 `getBottomY()` 供 Main 计算滚动高度 |
| 修改 | `js/game/Tutorial.js` | **高亮区域滚动偏移适配**、文本位置动态调整、步骤 4 遮罩修正 |
| 修改 | `js/ui/Button.js` | 点击时触发音效 |
| 修改 | `prd.md`, `tech.md` | 更新文档 |
| 修改 | `server/routes/index.js` | 新增 `/user/double-score` 路由 |
| 修改 | `server/controllers/authController.js` | 新增 `doubleScore` 方法，`dailySign` 返回 streak |
| 修改 | `server/models/User.js` | 新增 `last_sign_date`, `sign_streak` 字段 |
| 修改 | `server/services/userService.js` | 更新 `dailySign` 支持阶梯奖励，`getMe` 返回签到状态 |

---

## 14. 风险与注意事项

1. **广告单元 ID**：需要在微信公众平台注册小游戏后才能获取正式 ID，开发阶段使用测试 ID
2. **音效文件**：需要用户手动下载放入 `audio/` 目录，未放入时音效播放静默失败
3. **引导与游戏逻辑的交互**：引导期间需拦截所有触摸事件，引导的"操作示范"步骤需要实时监听玩家操作
4. **Canvas 层级**：引导遮罩需在所有元素之上绘制，签到面板仅在菜单页显示
5. **Banner 广告**：菜单页显示，进入游戏或编辑器时隐藏
6. **滚动性能**：统一游戏滚动使用 Canvas clip + translate，需确保裁剪区域计算正确；惯性动画使用 requestAnimationFrame，在低端设备上需注意帧率
7. **触摸冲突**：菜单页滚动与游戏页滚动状态完全隔离（不同 screen state），引导激活期间禁止滚动区域触摸，防止误操作
8. **关卡切换重置**：进入新关卡时必须重置 `gameScrollY = 0`，避免滚动位置残留导致内容错位

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `js/ads/AdManager.js` | 广告管理器 |
| 新增 | `js/audio/SoundManager.js` | 音效管理器 |
| 新增 | `js/game/DailySign.js` | 签到面板 |
| 新增 | `js/game/Tutorial.js` | 新手引导 |
| 新增 | `audio/` 目录 | 音效文件（用户自行下载放入） |
| 修改 | `js/databus.js` | 新增 hintCards, todaySigned, signStreak, soundMuted, tutorialDone |
| 修改 | `js/main.js` | 集成 4 个新模块，touch/render 流程调整 |
| 修改 | `js/game/MenuScreen.js` | 看广告按钮、静音按钮、每日签到入口 |
| 修改 | `js/ui/HUD.js` | 体力不足广告入口、提示不足广告入口、静音按钮 |
| 修改 | `js/game/Grid.js` | 通关后"看广告翻倍积分"按钮、放置成功/失败音效 |
| 修改 | `js/game/FragmentBar.js` | 放置音效（通过 Grid 间接调用） |
| 修改 | `js/ui/Button.js` | 点击时触发音效 |
| 修改 | `prd.md`, `tech.md` | 更新文档 |
| 修改 | `server/routes/index.js` | 新增 `/user/double-score` 路由 |
| 修改 | `server/controllers/authController.js` | 新增 `doubleScore` 方法，`dailySign` 返回 streak |
| 修改 | `server/models/User.js` | 新增 `last_sign_date`, `sign_streak` 字段 |
| 修改 | `server/services/userService.js` | 更新 `dailySign` 支持阶梯奖励，`getMe` 返回签到状态 |

---

## 10. 风险与注意事项

1. **广告单元 ID**：需要在微信公众平台注册小游戏后才能获取正式 ID，开发阶段使用测试 ID
2. **音效文件**：需要用户手动下载放入 `audio/` 目录，未放入时音效播放静默失败
3. **引导与游戏逻辑的交互**：引导期间需拦截所有触摸事件，引导的"操作示范"步骤需要实时监听玩家操作
4. **Canvas 层级**：引导遮罩需在所有元素之上绘制，签到面板仅在菜单页显示
5. **Banner 广告**：菜单页显示，进入游戏或编辑器时隐藏
