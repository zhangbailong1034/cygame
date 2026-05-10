const { LevelConfig, UserProgress, User } = require('../models');

async function getLevelList() {
  const configs = await LevelConfig.findAll({
    order: [['level_id', 'ASC']],
  });
  return configs.map(config => {
    const dims = calculateEffectiveDimensions(config);
    return {
      level_id: config.level_id,
      difficulty: config.difficulty,
      rows: dims.rows,
      cols: dims.cols,
      min_score: config.min_score,
    };
  });
}

async function getLevelData(levelId, userId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404 });

  const dims = calculateEffectiveDimensions(config);

  let progress = await UserProgress.findOne({ where: { user_id: userId, level_id: levelId } });
  if (!progress) {
    const gridState = [];
    for (let r = 0; r < dims.rows; r++) {
      gridState[r] = new Array(dims.cols).fill(null);
    }
    for (const cell of config.fixed_cells) {
      gridState[cell.row][cell.col] = cell.char;
    }
    progress = await UserProgress.create({
      user_id: userId,
      level_id: levelId,
      grid_state: gridState,
      used_fragments: [],
    });
  }

  const used = progress.used_fragments || [];
  const allFragments = [...config.fragments];
  const availableFragments = allFragments.filter(f => {
    const key = f.text + '_' + JSON.stringify(f.positions);
    return !used.includes(key);
  });
  availableFragments.sort(() => Math.random() - 0.5);

  return {
    levelId: config.level_id,
    rows: dims.rows,
    cols: dims.cols,
    gridState: progress.grid_state,
    fragments: availableFragments,
    distractors: config.distractors || [],
  };
}

function calculateEffectiveDimensions(config) {
  let minRow = Infinity, maxRow = -Infinity;
  let minCol = Infinity, maxCol = -Infinity;

  for (const idiom of config.idioms) {
    if (idiom.direction === 'horizontal') {
      minRow = Math.min(minRow, idiom.row);
      maxRow = Math.max(maxRow, idiom.row);
      minCol = Math.min(minCol, idiom.startCol);
      maxCol = Math.max(maxCol, idiom.endCol);
    } else {
      minRow = Math.min(minRow, idiom.startRow);
      maxRow = Math.max(maxRow, idiom.endRow);
      minCol = Math.min(minCol, idiom.col);
      maxCol = Math.max(maxCol, idiom.col);
    }
  }

  for (const cell of config.fixed_cells || []) {
    minRow = Math.min(minRow, cell.row);
    maxRow = Math.max(maxRow, cell.row);
    minCol = Math.min(minCol, cell.col);
    maxCol = Math.max(maxCol, cell.col);
  }

  return {
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
  };
}

function buildAnswerMap(config) {
  const map = {};
  for (const idiom of config.idioms) {
    const chars = idiom.answer.split('');
    if (idiom.direction === 'horizontal') {
      for (let i = 0; i < chars.length; i++) {
        const key = `${idiom.row},${idiom.startCol + i}`;
        map[key] = chars[i];
      }
    } else {
      for (let i = 0; i < chars.length; i++) {
        const key = `${idiom.startRow + i},${idiom.col}`;
        map[key] = chars[i];
      }
    }
  }
  return map;
}

module.exports = { getLevelList, getLevelData, buildAnswerMap, calculateEffectiveDimensions };
