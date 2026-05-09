# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeChat Mini Game (微信小游戏) project. Currently contains the quickstart airplane shooter template, but the PRD (`prd.md`) and tech spec (`tech.md`) define the target product: a Chinese idiom fragment puzzle game (成语碎片拼合游戏) where players drag/click character fragments into a crossword grid to form idioms.

## Development

Open the project in **微信开发者工具 (WeChat DevTools)** — it reads `project.config.json` and `game.json` to configure the mini game runtime. The `compileType` is `"game"` (not miniprogram), so it uses Canvas for rendering.

- `game.js` is the entry point that instantiates `Main` from `js/main.js`.
- `game.json` sets `deviceOrientation: portrait`.
- ESLint config at `.eslintrc.js` with `wx` and other WeChat globals declared.

There are no build/lint/test scripts — this is a vanilla WeChat Mini Game project run directly in WeChat DevTools.

## Architecture (current template)

The game loop follows a standard Canvas game pattern:

- **`game.js`** — entry point, imports and instantiates `Main`.
- **`js/main.js`** — the game loop (`update` → `render` → `requestAnimationFrame`), owns the player, background, UI, and enemy spawn timer.
- **`js/databus.js`** — singleton state manager (frame count, score, game-over flag, object pools for enemies/bullets, animation list).
- **`js/render.js`** — creates the Canvas via `wx.createCanvas()`, sizes it to screen dimensions, exports `SCREEN_WIDTH` / `SCREEN_HEIGHT`.
- **`js/base/pool.js`** — generic object pool for reusing game objects.
- **`js/base/sprite.js`** — base sprite class with position, size, visibility, and collision detection.
- **`js/base/animation.js`** — simple frame animation implementation.
- **`js/libs/tinyemitter.js`** — lightweight event emitter (on/off/emit).
- **`js/player/`** — player airplane and bullet classes.
- **`js/npc/enemy.js`** — enemy airplane class.
- **`js/runtime/`** — background scrolling, score/game-over UI, and music manager.

Global state is stored on `GameGlobal` (WeChat's global object for mini games): `GameGlobal.databus` and `GameGlobal.musicManager`.

## Target Architecture (per tech.md)

The idiom puzzle game will replace the shooter. Key design decisions:

- **Frontend**: WeChat Mini Game native (Canvas-based), pure click interaction for v1 (drag-and-drop deferred).
- **Backend**: WeChat Cloud Development (CloudBase) — cloud functions (Node.js), JSON database, cloud storage.
- **Security**: All game logic validation runs in cloud functions; the client only does optimistic local checks. Correct answers never leak to the client.
- **Data flow**: Cloud function `getLevelData` → grid state + available fragments → user interacts → `placeFragment` cloud function validates and persists.
- **Stamina system**: Server-authoritative with client-side polling for recovery.
