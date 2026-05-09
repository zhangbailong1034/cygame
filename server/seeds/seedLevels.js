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
      { direction: 'horizontal', row: 0, startCol: 0, endCol: 3, answer: '一心一意' },
      { direction: 'vertical', col: 0, startRow: 0, endRow: 3, answer: '一马当先' },
    ],
    fragments: [
      { text: '心', length: 1, positions: [[0,1]] },
      { text: '一', length: 1, positions: [[0,2]] },
      { text: '意', length: 1, positions: [[0,3]] },
      { text: '马', length: 1, positions: [[1,0]] },
      { text: '当', length: 1, positions: [[2,0]] },
      { text: '先', length: 1, positions: [[3,0]] },
    ],
    distractors: [{ text: '天', length: 1 }],
  },
  {
    level_id: 2,
    rows: 5, cols: 5,
    difficulty: 'easy', min_score: 50,
    fixed_cells: [
      { row: 0, col: 0, char: '欢' }, { row: 0, col: 1, char: '声' },
      { row: 2, col: 2, char: '如' }, { row: 3, col: 3, char: '贯' },
      { row: 4, col: 0, char: '交' }, { row: 4, col: 1, char: '头' },
    ],
    idioms: [
      { direction: 'horizontal', row: 0, startCol: 0, endCol: 3, answer: '欢声如雷' },
      { direction: 'horizontal', row: 4, startCol: 0, endCol: 3, answer: '交头接耳' },
      { direction: 'vertical', col: 2, startRow: 0, endRow: 4, answer: '如雷贯耳' },
    ],
    fragments: [
      { text: '雷', length: 1, positions: [[0,4]] },
      { text: '接', length: 1, positions: [[1,2]] },
      { text: '风', length: 1, positions: [[0,2]] },
      { text: '耳', length: 1, positions: [[4,4]] },
      { text: '动', length: 1, positions: [[4,3]] },
    ],
    distractors: [{ text: '天', length: 1 }, { text: '地', length: 1 }],
  },
  {
    level_id: 3,
    rows: 4, cols: 4,
    difficulty: 'medium', min_score: 60,
    fixed_cells: [
      { row: 0, col: 0, char: '花' },
      { row: 1, col: 3, char: '春' },
    ],
    idioms: [
      { direction: 'horizontal', row: 0, startCol: 0, endCol: 3, answer: '花好月圆' },
      { direction: 'horizontal', row: 1, startCol: 0, endCol: 3, answer: '春暖花开' },
      { direction: 'vertical', col: 3, startRow: 0, endRow: 4, answer: '花好月圆' },
    ],
    fragments: [
      { text: '好', length: 1, positions: [[0,1]] },
      { text: '月', length: 1, positions: [[0,2]] },
      { text: '圆', length: 1, positions: [[0,2]] },
      { text: '花', length: 1, positions: [[0,3]] },
      { text: '开', length: 1, positions: [[1,3]] },
    ],
    distractors: [{ text: '风', length: 1 }],
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
