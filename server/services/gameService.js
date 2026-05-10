const { LevelConfig, UserProgress, User } = require('../models');

function fragmentKey(f) {
  return f.text + '_' + JSON.stringify(f.positions);
}

async function placeFragment(levelId, fragmentText, positions, userId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404, code: 'level_not_found' });

  let progress = await UserProgress.findOne({
    where: { user_id: userId, level_id: levelId },
  });
  if (!progress) {
    const gridState = [];
    const { calculateEffectiveDimensions } = require('./levelService');
    const dims = calculateEffectiveDimensions(config);
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

  const fragmentDef = config.fragments.find(f => {
    if (f.text !== fragmentText) return false;
    if (used.includes(fragmentKey(f))) return false;
    const expected = f.positions;
    if (positions.length !== expected.length) return false;
    return positions.every((p, i) => p[0] === expected[i][0] && p[1] === expected[i][1]);
  });

  if (!fragmentDef) {
    const anyWithText = config.fragments.find(f => f.text === fragmentText);
    if (!anyWithText) {
      throw Object.assign(new Error('碎片不存在'), { status: 400, code: 'fragment_not_found' });
    }
    throw Object.assign(new Error('位置不对'), { status: 400, code: 'position_mismatch' });
  }

  const gridState = progress.grid_state;
  const chars = fragmentText.split('');
  for (let i = 0; i < chars.length; i++) {
    const [r, c] = positions[i];
    gridState[r][c] = chars[i];
  }

  const usedKey = fragmentKey(fragmentDef);
  const usedFragments = [...used, usedKey];

  progress.grid_state = gridState;
  progress.used_fragments = usedFragments;
  progress.changed('grid_state', true);
  progress.changed('used_fragments', true);

  const allKeys = config.fragments.map(f => fragmentKey(f));
  const isComplete = allKeys.every(k => usedFragments.includes(k));

  if (isComplete) {
    progress.completed = true;
    progress.completed_at = new Date();
  }
  await progress.save();

  const user = await User.findByPk(userId);
  user.total_score += 5;
  if (isComplete) {
    user.total_score += config.min_score;
    user.stamina = Math.min(10, user.stamina + 2);
    user.current_level = Math.max(user.current_level, levelId + 1);
  }
  await user.save();

  const result = {
    success: true,
    gridState,
    fragments: config.fragments.filter(f => !usedFragments.includes(fragmentKey(f))),
    stamina: user.stamina,
    scoreDelta: isComplete ? 5 + config.min_score : 5,
    totalScore: user.total_score,
    isComplete,
  };

  if (isComplete) {
    result.idioms = config.idioms.map(i => ({ answer: i.answer, meaning: i.meaning || '' }));
  }

  return result;
}

async function resetLevel(levelId, userId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404 });

  const { calculateEffectiveDimensions } = require('./levelService');
  const dims = calculateEffectiveDimensions(config);
  const gridState = [];
  for (let r = 0; r < dims.rows; r++) {
    gridState[r] = new Array(dims.cols).fill(null);
  }
  for (const cell of config.fixed_cells) {
    gridState[cell.row][cell.col] = cell.char;
  }

  await UserProgress.destroy({ where: { user_id: userId, level_id: levelId } });

  await UserProgress.create({
    user_id: userId,
    level_id: levelId,
    grid_state: gridState,
    used_fragments: [],
  });

  const user = await User.findByPk(userId);
  user.stamina = Math.max(0, user.stamina - 1);
  await user.save();

  return { stamina: user.stamina };
}

module.exports = { placeFragment, resetLevel };
