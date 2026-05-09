const { sequelize, LevelConfig } = require('../models');

const levels = [
  {
    level_id: 1,
    rows: 3, cols: 4,
    difficulty: 'easy', min_score: 30,
    fixed_cells: [
      { row: 0, col: 0, char: '一' },
    ],
    idioms: [
      { direction: 'horizontal', row: 0, startCol: 0, endCol: 3, answer: '一帆风顺' },
      { direction: 'horizontal', row: 1, startCol: 0, endCol: 3, answer: '马到成功' },
    ],
    fragments: [
      { text: '帆', length: 1, positions: [[0,1]] },
      { text: '风', length: 1, positions: [[0,2]] },
      { text: '顺', length: 1, positions: [[0,3]] },
      { text: '马', length: 1, positions: [[1,0]] },
      { text: '到', length: 1, positions: [[1,1]] },
      { text: '成', length: 1, positions: [[1,2]] },
      { text: '功', length: 1, positions: [[1,3]] },
    ],
    distractors: [{ text: '天', length: 1 }],
  },
  {
    level_id: 2,
    rows: 3, cols: 4,
    difficulty: 'easy', min_score: 40,
    fixed_cells: [
      { row: 0, col: 0, char: '千' },
    ],
    idioms: [
      { direction: 'horizontal', row: 0, startCol: 0, endCol: 3, answer: '千变万化' },
      { direction: 'horizontal', row: 1, startCol: 0, endCol: 3, answer: '心花怒放' },
    ],
    fragments: [
      { text: '变', length: 1, positions: [[0,1]] },
      { text: '万', length: 1, positions: [[0,2]] },
      { text: '化', length: 1, positions: [[0,3]] },
      { text: '心', length: 1, positions: [[1,0]] },
      { text: '花', length: 1, positions: [[1,1]] },
      { text: '怒', length: 1, positions: [[1,2]] },
      { text: '放', length: 1, positions: [[1,3]] },
    ],
    distractors: [{ text: '地', length: 1 }, { text: '火', length: 1 }],
  },
  {
    level_id: 3,
    rows: 4, cols: 4,
    difficulty: 'medium', min_score: 60,
    fixed_cells: [
      { row: 0, col: 0, char: '花' },
    ],
    idioms: [
      { direction: 'horizontal', row: 0, startCol: 0, endCol: 3, answer: '花好月圆' },
      { direction: 'horizontal', row: 1, startCol: 0, endCol: 3, answer: '如花似锦' },
      { direction: 'horizontal', row: 2, startCol: 0, endCol: 3, answer: '春暖花开' },
    ],
    fragments: [
      { text: '好', length: 1, positions: [[0,1]] },
      { text: '月', length: 1, positions: [[0,2]] },
      { text: '圆', length: 1, positions: [[0,3]] },
      { text: '如', length: 1, positions: [[1,0]] },
      { text: '花', length: 1, positions: [[1,1]] },
      { text: '似', length: 1, positions: [[1,2]] },
      { text: '锦', length: 1, positions: [[1,3]] },
      { text: '春', length: 1, positions: [[2,0]] },
      { text: '暖', length: 1, positions: [[2,1]] },
      { text: '花', length: 1, positions: [[2,2]] },
      { text: '开', length: 1, positions: [[2,3]] },
    ],
    distractors: [{ text: '风', length: 1 }, { text: '雪', length: 1 }],
  },
];

async function seed() {
  await sequelize.sync({ force: true });
  for (const lvl of levels) {
    await LevelConfig.create(lvl);
  }
  console.log('Seed data inserted.');
  process.exit(0);
}

seed();
