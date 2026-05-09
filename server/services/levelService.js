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

  const used = progress.used_fragments || [];
  const allFragments = [...config.fragments];
  const availableFragments = allFragments.filter(f => !used.includes(f.text));
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
