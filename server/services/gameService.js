const { LevelConfig, UserProgress, User } = require('../models');

async function placeFragment(levelId, fragmentText, positions, userId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404, code: 'level_not_found' });

  const progress = await UserProgress.findOne({
    where: { user_id: userId, level_id: levelId },
  });

  if (progress.used_fragments.includes(fragmentText)) {
    throw Object.assign(new Error('碎片已使用'), { status: 400, code: 'already_used' });
  }

  const fragmentDef = config.fragments.find(f => f.text === fragmentText);
  if (!fragmentDef) {
    throw Object.assign(new Error('碎片不存在'), { status: 400, code: 'fragment_not_found' });
  }

  const expectedPositions = fragmentDef.positions;
  if (positions.length !== expectedPositions.length) {
    throw Object.assign(new Error('位置不对'), { status: 400, code: 'position_mismatch' });
  }
  for (let i = 0; i < positions.length; i++) {
    if (positions[i][0] !== expectedPositions[i][0] || positions[i][1] !== expectedPositions[i][1]) {
      throw Object.assign(new Error('位置不对'), { status: 400, code: 'position_mismatch' });
    }
  }

  const gridState = progress.grid_state;
  const chars = fragmentText.split('');
  for (let i = 0; i < chars.length; i++) {
    const [r, c] = positions[i];
    gridState[r][c] = chars[i];
  }

  const usedFragments = [...progress.used_fragments, fragmentText];

  progress.grid_state = gridState;
  progress.used_fragments = usedFragments;
  progress.changed('grid_state', true);
  progress.changed('used_fragments', true);

  const allFragmentTexts = config.fragments.map(f => f.text);
  const isComplete = allFragmentTexts.every(t => usedFragments.includes(t));

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

async function resetLevel(levelId, userId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404 });

  const gridState = [];
  for (let r = 0; r < config.rows; r++) {
    gridState[r] = new Array(config.cols).fill(null);
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
