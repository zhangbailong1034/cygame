# 技术文档：成语碎片拼合游戏（微信小游戏）

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| V1.0 | 2026-05-09 | 技术团队 | 初版 |
| V1.1 | 2026-05-10 | 技术团队 | 更新至实际架构：Express+MySQL+Canvas |

## 1. 技术选型

| 模块 | 技术栈 | 理由 |
|------|--------|------|
| 前端 | 微信小游戏原生框架 (Canvas 2D + JavaScript) | 纯 Canvas 渲染，无 WXML/WXSS；灵活控制像素级 UI |
| 后端 | Node.js + Express 5.x | RESTful API，本地开发直连 MySQL，部署灵活 |
| 数据库 | MySQL + Sequelize ORM | 关系型数据适合关卡配置、用户进度等结构化数据 |
| 认证 | JWT (openId) | 微信 openId 作为用户标识，token 放入 Authorization header |
| 关卡生成 | Node.js 脚本 | 服务端脚本离线生成关卡 JSON，通过 seeding 导入数据库 |

## 2. 系统架构

```
微信小游戏客户端 (Canvas 2D)
        |
        | HTTP (wx.request)
        v
Express API 服务器 (localhost:3000)
        |
        | Sequelize ORM
        v
MySQL 数据库 (cygame_dev)
```

- **客户端**：纯 Canvas 渲染，所有 UI（按钮、网格、碎片、弹窗）均用 Canvas 2D API 绘制。
- **服务端**：Express 路由处理所有游戏逻辑（关卡数据、碎片校验、体力/积分、排行榜）。
- **数据库**：MySQL 存储用户、关卡配置、进度、排行榜数据。

## 3. 数据库表设计

### 3.1 `users` 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增主键 |
| openId | VARCHAR(255) UNIQUE | 微信 openId |
| nickName | VARCHAR(255) | 用户昵称 |
| avatarUrl | VARCHAR(500) | 用户头像 |
| level | INT | 已解锁最高关卡（默认1） |
| totalScore | INT | 总积分 |
| stamina | INT | 当前体力值（上限10） |
| lastStaminaRecover | DATE | 上次体力恢复时间 |

### 3.2 `level_configs` 表（关卡静态配置）
| 字段 | 类型 | 说明 |
|------|------|------|
| level_id | INT PK | 关卡号（1~200） |
| rows | INT | 网格行数 |
| cols | INT | 网格列数 |
| fixedCells | JSON | `[{row,col,char}]` |
| idioms | JSON | `[{direction, row/col, startCol/startRow, endCol/endRow, answer}]` |
| fragments | JSON | `[{text, length, positions:[[row,col],...]}]` |
| distractors | JSON | 干扰碎片 `[{text, length}]` |
| min_score | INT | 通关奖励基础积分 |
| difficulty | VARCHAR(20) | easy/medium/hard |

### 3.3 `user_progress` 表（用户关卡进度）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增主键 |
| openId | VARCHAR(255) | 用户标识 |
| levelId | INT | 关卡号 |
| gridState | JSON | 二维数组，存储每个格子的当前字符或 null |
| usedFragments | JSON | 已使用的碎片 uid 列表 |
| completed | BOOL | 是否已通关 |

### 3.4 `leaderboard` 表（排行榜）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增主键 |
| openId | VARCHAR(255) | 用户标识 |
| nickName | VARCHAR(255) | 昵称 |
| avatarUrl | VARCHAR(500) | 头像 |
| level | INT | 最高通关关卡 |
| totalScore | INT | 总积分 |

### 3.5 `saved_idioms` 表（用户收藏成语）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增主键 |
| openId | VARCHAR(255) | 用户标识 |
| answer | VARCHAR(50) | 成语文本 |
| meaning | TEXT | 成语释义 |

## 4. API 接口设计

所有接口均通过 `Authorization: Bearer <token>` 进行 JWT 认证。

### 4.1 `POST /api/auth/login` - 用户登录/注册
- **入参**：`{ code }`（微信登录 code）
- **处理**：通过微信 API 获取 openId，查找或创建用户，返回 JWT token。
- **返回**：`{ token, user: { level, totalScore, stamina } }`

### 4.2 `GET /api/levels` - 获取关卡列表
- **返回**：`{ levels: [{ level_id, difficulty }] }`

### 4.3 `GET /api/levels/:levelId` - 获取关卡完整数据
- **处理**：读取关卡配置，初始化/读取用户进度，动态生成碎片区。
- **返回**：`{ config, rows, cols, gridState, fragments, distractors, stamina, totalScore }`

### 4.4 `POST /api/levels/:levelId/place` - 放置碎片（核心校验）
- **入参**：`{ fragmentText, positions: [[row,col],...] }`
- **处理**：
  1. 校验体力 > 0
  2. 校验碎片尚未使用
  3. 校验 positions 与后台预设一致
  4. 逐个格子校验字符匹配
  5. 匹配成功：更新 gridState，移除碎片，+5 分
  6. 匹配失败：-1 体力，返回错误
  7. 检查是否通关
- **返回**：`{ gridState, fragments, stamina, totalScore, isComplete, idioms?, scoreDelta? }`

### 4.5 `POST /api/levels/:levelId/hint` - 提示指定空格
- **入参**：`{ row, col, hintType }`
- **处理**：找到该空格应填入的碎片，返回碎片文本。
- **消耗**：积分 -10
- **返回**：`{ fragmentText, totalScore }`

### 4.6 `POST /api/levels/:levelId/reset` - 重置关卡
- **处理**：删除用户进度，扣除体力。
- **返回**：`{ stamina }`

### 4.7 `GET /api/leaderboard` - 获取排行榜
- **返回**：`{ rankings: [{ nickName, avatarUrl, level, totalScore }] }`

### 4.8 `GET /api/idioms/saved` - 获取收藏成语
- **返回**：`{ idioms: [{ answer, meaning }] }`

### 4.9 `POST /api/idioms/save` - 收藏成语
- **入参**：`{ answer, meaning }`

## 5. 前端关键模块

### 5.1 入口与游戏循环
- `game.js` → `js/main.js`：标准 Canvas 游戏循环（`requestAnimationFrame`）。
- 循环结构：`update()` → `render()` → `requestAnimationFrame(loop)`。
- 全局状态：`GameGlobal.databus`（DataBus 单例），`GameGlobal.main`（Main 实例）。

### 5.2 核心模块
| 文件 | 职责 |
|------|------|
| `js/main.js` | 游戏主循环、场景路由（MENU/PLAYING/EDITOR） |
| `js/databus.js` | 全局状态管理：关卡数据、碎片、选中状态、预览模式 |
| `js/render.js` | Canvas 初始化，导出 `SCREEN_WIDTH`/`SCREEN_HEIGHT` |
| `js/game/MenuScreen.js` | 菜单页：关卡列表（分页）、排行榜、学习记录 |
| `js/game/Grid.js` | 游戏网格：渲染、点击检测、碎片放置、通关处理 |
| `js/game/FragmentBar.js` | 碎片区：多行自动换行、选择、渲染 |
| `js/ui/HUD.js` | 顶部/底部 UI：返回、提示、洗牌、重置按钮、状态栏 |
| `js/ui/Button.js` | 通用按钮组件：背景、文本、点击检测 |
| `js/ui/Dialog.js` | 弹窗：通关展示、排行榜、成语收藏、分享 |
| `js/api/index.js` | API 封装：封装 `wx.request` 调用所有后端接口 |

### 5.3 碎片点击交互
1. 用户点击碎片区某个碎片 → 碎片高亮（橙色边框）。
2. 单字碎片：用户点击一个空格 → 调用 `placeFragment`。
3. 多字碎片：用户依次点击两个相邻空格 → 校验连续性 → 调用 `placeFragment`。
4. 放置失败：碎片退回，体力-1；放置成功：碎片从碎片区移除。

### 5.4 网格动态尺寸
- 根据屏幕宽度和网格列数动态计算 cellSize：`Math.min(54, floor((maxWidth - gaps) / cols))`。
- 保证 6-7 列宽网格在小屏幕上完整显示。

### 5.5 预览模式
- `DataBus.previewMode` 标志位控制。
- 预览模式下 Grid、FragmentBar、HUD 的所有操作按钮均返回 toast 提示"预览模式，无法操作"。
- 标题栏显示"[预览]"标识。

### 5.6 关卡分页
- `MenuScreen` 维护 `page`、`perPage=18`、`totalPages` 状态。
- 每页 3 列 × 6 行，底部提供上一页/下一页按钮和页码指示器。

## 6. 关卡生成系统

### 6.1 基础模式（`generateLevels.js`）
- 成语独立放置在各自的行或列，互不交叉。
- 支持横向和纵向成语混合。
- 参数：关卡号、难度、成语列表、横向数量、纵向数量、总列数。

### 6.2 纵横字谜模式（`generateCrosswordLevels.js`）
- 基于字符索引 (`char → [{poolIdx, charIdx, idiom}]`) 的交叉算法。
- 算法流程：
  1. 随机选择第一个成语，水平放置在网格中央。
  2. 遍历网格中已填充的每个字符，在字符索引中查找包含相同字符的其他成语。
  3. 找到可交叉的成语后，垂直于现有成语放置（水平→垂直，垂直→水平）。
  4. 校验边界和冲突（交叉点字符必须匹配）。
  5. 若找不到交叉点，降级为非交叉放置。
  6. 每个关卡重试 5 次（不同随机种子），确保生成足够的成语。
- 生成 100 关（101-200），渐进难度。
- 结果输出为 `crosswordLevels.json`，由 `seedLevels.js` 统一导入。

## 7. 安全性设计

- **所有游戏逻辑在服务端执行**：碎片匹配、体力扣减、积分增加均在 Express 路由中处理。
- **正确答案不泄露**：`getLevelData` 返回的 fragments 不包含正确答案位置信息（客户端仅用于渲染，校验在服务端）。
- **JWT 认证**：所有 API 请求需携带 token，token 由微信 code 换取。
- **服务端校验 positions**：客户端传入的放置位置必须与后台预设完全一致。

## 8. 部署

- **开发环境**：Express 本地运行于 `localhost:3000`，MySQL 本地实例 `cygame_dev`。
- **微信开发者工具**：加载项目目录，`project.config.json` 配置小游戏编译类型。
- **初始化**：
  1. `npm install` 安装依赖。
  2. 配置 MySQL 连接（`server/config/database.js`）。
  3. 运行 `node server/seeds/seedLevels.js` 初始化数据库和关卡数据。
  4. 启动 `node server/app.js`。

## 9. 文件结构

```
cygame/
├── game.js                    # 微信小游戏入口
├── game.json                  # 小游戏配置
├── project.config.json        # 微信开发者工具配置
├── js/
│   ├── main.js                # 游戏主循环
│   ├── databus.js             # 全局状态管理
│   ├── render.js              # Canvas 初始化
│   ├── api/
│   │   └── index.js           # API 请求封装
│   ├── game/
│   │   ├── MenuScreen.js      # 菜单页
│   │   ├── Grid.js            # 游戏网格
│   │   └── FragmentBar.js     # 碎片区
│   └── ui/
│       ├── Button.js          # 按钮组件
│       ├── Dialog.js          # 弹窗组件
│       └── HUD.js             # 界面头部和底部
├── server/
│   ├── app.js                 # Express 入口
│   ├── config/
│   │   └── database.js        # 数据库配置
│   ├── models/                # Sequelize 模型
│   ├── routes/                # API 路由
│   ├── services/              # 业务逻辑层
│   └── seeds/
│       ├── seedLevels.js      # 数据库初始化
│       ├── generateLevels.js  # 基础关卡生成器
│       └── generateCrosswordLevels.js  # 纵横字谜生成器
├── prd.md                     # 产品需求文档
└── tech.md                    # 技术文档（本文件）
```
