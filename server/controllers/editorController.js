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
