const { LevelConfig, HintLog } = require('../models');
const { buildAnswerMap } = require('./levelService');

async function getHint(levelId, row, col, hintType, userId) {
  const config = await LevelConfig.findOne({ where: { level_id: levelId } });
  if (!config) throw Object.assign(new Error('关卡不存在'), { status: 404 });

  const answerMap = buildAnswerMap(config);
  const targetChar = answerMap[`${row},${col}`];
  if (!targetChar) {
    throw Object.assign(new Error('该格子不是空格'), { status: 400, code: 'not_empty' });
  }

  const fragment = config.fragments.find(f => f.text.includes(targetChar));
  if (!fragment) {
    throw Object.assign(new Error('未找到对应碎片'), { status: 400, code: 'fragment_not_found' });
  }

  await HintLog.create({
    user_id: userId,
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
