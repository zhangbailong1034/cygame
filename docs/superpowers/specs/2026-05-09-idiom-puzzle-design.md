# 成语碎片拼合游戏 — 设计文档

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| V1.0 | 2026-05-09 | 技术团队 | 完整架构设计 |

## 1. 技术选型

| 模块 | 技术 | 说明 |
|------|------|------|
| 前端 | 微信小游戏 Canvas（compileType: "game"） | 纯 Canvas 绘制 UI，自建命中检测 |
| 后端 | Node.js + Express | REST API，运行在 localhost |
| 数据库 | MySQL `pygame_dev` | 本地部署 |
| ORM | Sequelize | 模型定义、迁移、关联查询 |
| 即时通讯 | 无（纯请求-响应） | |

开发环境：微信开发者工具（前端）+ VS Code（后端），本地开发不依赖云服务。

## 2. 系统架构

```
┌── 微信小游戏 (Canvas) ──────────────────────┐
│  game.js → js/main.js (主循环)                │
│  ├── game/Grid.js        (网格渲染与交互)      │
│  ├── game/FragmentBar.js (碎片区渲染与交互)    │
│  ├── game/GameController.js (游戏流程编排)    │
│  ├── game/Editor.js      (内嵌关卡编辑器)      │
│  ├── ui/HUD.js           (顶栏/按钮/状态)      │
│  ├── ui/Button.js        (Canvas 按钮基类)     │
│  ├── ui/Toast.js         (轻提示)              │
│  ├── ui/Dialog.js        (弹窗)                │
│  ├── api/index.js        (HTTP 请求封装)       │
│  └── databus.js          (全局状态)            │
└────────── wx.request ────────────────────────┘
                    │
┌── Express REST API ──────────────────────────┐
│  routes/ → controllers/ → services/ → models/ │
│  ├── authController.js                        │
│  ├── levelController.js                       │
│  ├── gameController.js                        │
│  ├── hintController.js                        │
│  ├── editorController.js                      │
│  └── leaderboardController.js                 │
│  services/                                    │
│  ├── gameService.js       (核心校验逻辑)      │
│  ├── levelService.js      (关卡配置/碎片生成)  │
│  ├── userService.js       (体力/积分/签到)     │
│  ├── hintService.js       (提示计算)           │
│  └── leaderboardService.js                    │
│  middleware/                                   │
│  ├── auth.js              (token 鉴权)         │
│  └── errorHandler.js                          │
└────────── MySQL (pygame_dev) ────────────────┘
```

## 3. 数据库表

### `users`
| 列 | 类型 | 约束 |
|----|------|------|
| id | INT PK AUTO_INCREMENT | |
| open_id | VARCHAR(64) | UNIQUE |
| nick_name | VARCHAR(32) | |
| avatar_url | VARCHAR(256) | |
| current_level | INT | DEFAULT 1 |
| total_score | INT | DEFAULT 0 |
| stamina | INT | DEFAULT 10 |
| last_stamina_recover | DATETIME | NULL |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### `level_configs`
| 列 | 类型 | 约束 |
|----|------|------|
| id | INT PK AUTO_INCREMENT | |
| level_id | INT | UNIQUE |
| rows | INT | |
| cols | INT | |
| fixed_cells | JSON | `[{row,col,char}]` |
| idioms | JSON | `[{direction,row/col,start,end,answer}]` |
| fragments | JSON | `[{text,length,positions}]` |
| distractors | JSON | `[{text,length}]` |
| difficulty | ENUM('easy','medium','hard') | |
| min_score | INT | |

### `user_progress`
| 列 | 类型 |
|----|------|
| id | INT PK AUTO_INCREMENT |
| user_id | INT FK → users.id |
| level_id | INT |
| grid_state | JSON |
| used_fragments | JSON |
| completed | BOOL DEFAULT false |
| completed_at | DATETIME |
| created_at | DATETIME |
| updated_at | DATETIME |

### `leaderboards`
| 列 | 类型 |
|----|------|
| id | INT PK AUTO_INCREMENT |
| date | DATE |
| rankings | JSON |

### `hint_logs`
| 列 | 类型 |
|----|------|
| id | INT PK AUTO_INCREMENT |
| user_id | INT FK → users.id |
| level_id | INT |
| row | INT |
| col | INT |
| hint_type | ENUM('highlight','autofill') |
| created_at | DATETIME |

## 4. REST API

Base: `http://localhost:3000/api`

### 用户
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 登录/注册，返回 token |
| GET | `/user/me` | 当前用户信息 |
| POST | `/user/recover-stamina` | 体力恢复 |
| POST | `/user/daily-sign` | 每日签到 |

### 关卡
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/levels` | 关卡列表 |
| GET | `/levels/:levelId` | 关卡数据 + gridState + 碎片 |

### 游戏核心
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/game/place-fragment` | 放置碎片校验 |
| POST | `/game/hint` | 提示空格 |
| POST | `/game/reset` | 重置关卡 |
| POST | `/game/share-reward` | 分享奖励 |

### 编辑器
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/editor/save` | 保存关卡 |
| DELETE | `/editor/:levelId` | 删除关卡 |

### 排行
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/leaderboard` | 排行榜 |

### 核心接口请求/响应示例

**POST `/game/place-fragment`**
```
req:  { levelId: 2, fragmentText: "接风", positions: [[0,2],[0,3]] }
ok:   { success: true, gridState: [...], remainingFragments: [...], stamina: 8, scoreDelta: 5, isComplete: false }
fail: { success: false, error: "position_mismatch", message: "位置不对", stamina: 7 }
```

**POST `/game/hint`**
```
req:  { levelId: 2, row: 0, col: 2, hintType: "highlight" }
ok:   { fragmentText: "接风", positions: [[0,2],[0,3]], scoreDelta: -10 }
```

## 5. 前端组件设计

### 5.1 游戏主循环（main.js）
```
update(dt): 处理动画帧、状态转换
render(ctx): 调用各组件 draw()
touchHandler(x,y): 坐标分发到活跃组件
```

### 5.2 屏幕状态（databus 管理）
- `MENU` — 选关界面（首屏绘制关卡按钮）
- `PLAYING` — 游戏中
- `EDITOR` — 关卡编辑器
- `COMPLETE` — 通关弹窗叠加层

### 5.3 组件职责
| 组件 | 职责 |
|------|------|
| Grid | 绘制矩阵格子，三种样式（fixed/empty/filled），坐标→(row,col)映射 |
| FragmentBar | 碎片列表渲染，选中/已用/干扰状态，点击选中 |
| GameController | 流程编排，多字碎片两步点击，调用 API，更新 UI |
| HUD | 顶栏（关卡号、体力、积分）+ 底栏按钮（提示、洗牌、重置） |
| Editor | 网格编辑器，设置固定字、定义成语、生成碎片、预览 |

### 5.4 多字碎片交互流程
1. 点击碎片"接风"（length=2）→ 高亮，提示"选择连续空格"
2. GameController 进入 SELECTING_CELLS 状态
3. 点击第1个空格 → 高亮该格
4. 点击第2个空格 → 判断连续（同行列差1 或 同列行差1）
5. 连续则调 API，不连续则提示重选

### 5.5 编辑器入口
游戏中连续点击关卡号 5 次 → 进入编辑器模式。功能：设定网格尺寸、点格子设 fixed 字、定义成语、自动生成碎片、加干扰项、保存。

## 6. 核心游戏规则

### 6.1 碎片校验（gameService.js）
- 比对用户传入 positions 与后台 fragments 预设位置是否一致
- 逐格比对填入字符与 idiomes 推导的正确答案是否匹配
- 全部匹配：更新 gridState，移除碎片，+5 积分，检查通关
- 任一不匹配：退回碎片，-1 体力

### 6.2 体力与积分
| 行为 | 体力 | 积分 |
|------|------|------|
| 正确放置 | - | +5 |
| 放置错误 | -1 | - |
| 通关 | +2 | +50 |
| 提示 | - | -10 |
| 洗牌 | - | -5 |
| 重置 | -1 | - |
| 分享奖励 | +1 | - |

### 6.3 体力恢复
每 5 分钟恢复 1 点，上限 10。客户端每 30 秒轮询一次 `POST /user/recover-stamina`。

### 6.4 安全
- 正确答案不返回到前端（fragments 的 positions 只在服务端匹配）
- 云函数服务端校验每一笔放置操作
- 前端仅做乐观 local check 以减少无效请求

## 7. 关卡配置示例（关卡 2）

```json
{
  "levelId": 2,
  "rows": 5,
  "cols": 5,
  "fixedCells": [
    {"row":0,"col":0,"char":"欢"}, {"row":0,"col":1,"char":"声"},
    {"row":2,"col":2,"char":"如"}, {"row":3,"col":3,"char":"贯"},
    {"row":4,"col":0,"char":"交"}, {"row":4,"col":1,"char":"头"}
  ],
  "idioms": [
    {"direction":"horizontal","row":0,"startCol":0,"endCol":3,"answer":"欢声如雷"},
    {"direction":"horizontal","row":4,"startCol":0,"endCol":3,"answer":"交头接耳"},
    {"direction":"vertical","col":2,"startRow":0,"endRow":4,"answer":"如雷贯耳"}
  ],
  "fragments": [
    {"text":"雷","length":1,"positions":[[0,3]]},
    {"text":"接","length":1,"positions":[[1,2]]},
    {"text":"风","length":1,"positions":[[0,2]]},
    {"text":"耳","length":1,"positions":[[4,2]]},
    {"text":"动","length":1,"positions":[[4,3]]}
  ],
  "distractors": [{"text":"天","length":1},{"text":"地","length":1}],
  "difficulty": "easy",
  "minScore": 50
}
```

## 8. 前后端通信流程

### 进入关卡
```
前端 GET /levels/2
     ← { config, gridState, availableFragments, stamina }
前端 渲染网格 + 碎片区
```

### 放置碎片
```
前端 用户操作 → 本地预检(optimistic) → POST /game/place-fragment
     ← { success, gridState, remainingFragments, stamina, isComplete }
前端 更新网格，移除碎片，检查 isComplete
```

### 使用提示
```
前端 点击空格 + 提示按钮 → POST /game/hint
     ← { fragmentText, positions }
前端 高亮对应碎片
```

## 9. 开发顺序

1. 后端初始化：Express + Sequelize + 数据库迁移 + 种子数据
2. 前端框架搭建：Canvas 主循环 + 状态机 + 基础组件
3. 关卡获取 + 网格渲染 + 碎片区
4. 碎片放置交互 + 校验 API
5. 体力/积分系统 + 通关检测
6. 提示、洗牌、重置
7. 选关界面 + 签到
8. 关卡编辑器
9. 排行榜
