// Crossword idiom puzzle level generator — levels 101-200
// Idioms intersect at shared characters, like a real crossword puzzle.
const fs = require('fs');
const path = require('path');

// === Idiom Pool ===
const idiomPool = [
  { answer: '一帆风顺', meaning: '船挂满帆顺风行驶，比喻非常顺利，没有任何阻碍。' },
  { answer: '马到成功', meaning: '战马一到阵前就取得胜利，形容事情顺利，一开始就取得成功。' },
  { answer: '千变万化', meaning: '形容变化极多，没有穷尽。' },
  { answer: '心花怒放', meaning: '心里高兴得像花儿盛开一样，形容极其高兴。' },
  { answer: '花好月圆', meaning: '花儿正盛开，月亮正圆满，比喻美好圆满。' },
  { answer: '如花似锦', meaning: '如同花朵、锦缎一般，形容风景前程等十分美好。' },
  { answer: '春暖花开', meaning: '春天气候温暖，百花盛开，形容优美的景色或大好时机。' },
  { answer: '风和日丽', meaning: '微风和煦，阳光明丽，形容晴朗暖和的天气。' },
  { answer: '山清水秀', meaning: '山水风景优美，形容自然风光十分美丽。' },
  { answer: '鸟语花香', meaning: '鸟儿啼叫，花儿飘香，形容春天美好的景色。' },
  { answer: '龙飞凤舞', meaning: '如龙飞腾，如凤起舞，形容气势奔放或书法生动。' },
  { answer: '画龙点睛', meaning: '在关键处加上精辟的语句使内容更加生动传神。' },
  { answer: '对牛弹琴', meaning: '比喻对不懂道理的人讲道理，白费口舌。' },
  { answer: '守株待兔', meaning: '比喻死守狭隘经验，不知变通，也指不劳而获。' },
  { answer: '胸有成竹', meaning: '做事之前已经有了通盘的考虑和把握。' },
  { answer: '一鸣惊人', meaning: '平时没有突出的表现，一下子做出惊人的成绩。' },
  { answer: '三心二意', meaning: '想这样又想那样，形容犹豫不决或意志不坚定。' },
  { answer: '四面八方', meaning: '各个方面或各个地方。' },
  { answer: '五颜六色', meaning: '形容色彩繁多，各种各样。' },
  { answer: '七上八下', meaning: '形容心里慌乱不安，心神不定。' },
  { answer: '九牛一毛', meaning: '比喻极大数量中微不足道的一部分。' },
  { answer: '十全十美', meaning: '各方面都非常完美，毫无缺陷。' },
  { answer: '百发百中', meaning: '形容射箭或射击非常准确，比喻做事有充分把握。' },
  { answer: '万紫千红', meaning: '形容百花齐放，色彩艳丽，也比喻事物丰富多彩。' },
  { answer: '大同小异', meaning: '大部分相同，只有小部分不同。' },
  { answer: '天长地久', meaning: '形容时间长久，也指感情或友谊永恒不变。' },
  { answer: '开天辟地', meaning: '古代神话传说，指宇宙的开始，比喻前所未有的伟大事件。' },
  { answer: '惊天动地', meaning: '形容声音极大或声势浩大，使人震惊。' },
  { answer: '欢天喜地', meaning: '形容非常高兴，喜气洋洋。' },
  { answer: '冰天雪地', meaning: '形容冰雪漫天盖地，非常寒冷。' },
  { answer: '安然无恙', meaning: '平安无事，没有遭受损害或发生意外。' },
  { answer: '半途而废', meaning: '事情做到一半就停止，比喻做事有始无终。' },
  { answer: '别出心裁', meaning: '独创一格，与众不同，形容思路或设计独特。' },
  { answer: '不可思议', meaning: '无法想象，难以理解，形容事物非常奇特。' },
  { answer: '不言而喻', meaning: '不用说就可以明白，形容道理很明显。' },
  { answer: '层出不穷', meaning: '接连不断地出现，没有穷尽。' },
  { answer: '出类拔萃', meaning: '超出同类之上，形容品德、才能非常出众。' },
  { answer: '当机立断', meaning: '抓住时机立刻做出决断，形容做事果断。' },
  { answer: '独一无二', meaning: '只有这一个，没有可以与之相比的。' },
  { answer: '耳濡目染', meaning: '经常听到看到，不知不觉受到影响。' },
  { answer: '废寝忘食', meaning: '顾不上睡觉，忘了吃饭，形容非常专心努力。' },
  { answer: '各抒己见', meaning: '各人充分发表自己的见解。' },
  { answer: '刮目相看', meaning: '改变旧看法，用新眼光看待。' },
  { answer: '海阔天空', meaning: '形容大自然的广阔，也比喻想象或说话毫无拘束。' },
  { answer: '恍然大悟', meaning: '忽然一下子明白过来。' },
  { answer: '见义勇为', meaning: '看到正义的事情就勇敢地去做。' },
  { answer: '精益求精', meaning: '已经很好了，还要求更好。' },
  { answer: '刻舟求剑', meaning: '比喻不懂事物已发展变化而仍静止地看问题。' },
  { answer: '了如指掌', meaning: '形容对事物了解得非常清楚。' },
  { answer: '名列前茅', meaning: '名次列在前面，形容成绩优异。' },
  { answer: '名副其实', meaning: '名称或名声与实际相符合。' },
  { answer: '破釜沉舟', meaning: '比喻下决心不顾一切地干到底。' },
  { answer: '千钧一发', meaning: '千钧重物系在一根发丝上，比喻情况万分危急。' },
  { answer: '情不自禁', meaning: '感情激动得不能控制，强调完全被某种感情所支配。' },
  { answer: '如饥似渴', meaning: '形容要求很迫切，好像饿了急着要吃饭，渴了急着要喝水一样。' },
  { answer: '身临其境', meaning: '亲自到了那个境地，形容感受很真切。' },
  { answer: '世外桃源', meaning: '比喻不受外界影响的安乐美好之地。' },
  { answer: '水落石出', meaning: '水落下去，石头就露出来，比喻事情的真相完全显露。' },
  { answer: '脱颖而出', meaning: '锥尖透过布囊显露出来，比喻本领全部显露。' },
  { answer: '卧薪尝胆', meaning: '睡觉睡在柴草上，吃饭尝着苦胆，形容人刻苦自励，发奋图强。' },
  { answer: '悬梁刺股', meaning: '把头发系在屋梁上，用锥子刺大腿，形容刻苦学习。' },
  { answer: '负荆请罪', meaning: '背着荆条向对方请罪，比喻诚恳认错赔礼道歉。' },
  { answer: '完璧归赵', meaning: '把和氏璧完好地送回赵国，比喻把原物完整地归还本人。' },
  { answer: '纸上谈兵', meaning: '在纸面上谈论打仗，比喻空谈理论不能解决实际问题。' },
  { answer: '四面楚歌', meaning: '比喻陷入四面受敌、孤立无援的困境。' },
  { answer: '入木三分', meaning: '笔力深入木板三分，形容书法笔力刚劲有力，也指分析问题深刻。' },
  { answer: '才高八斗', meaning: '形容文才非常高，无人能及。' },
  { answer: '鹤立鸡群', meaning: '鹤站在鸡群中，比喻仪表或才能在人群中非常突出。' },
  { answer: '锦上添花', meaning: '在锦上再绣上花，比喻好上加好，美上添美。' },
  { answer: '举一反三', meaning: '从一件事类推出其他许多事，形容善于学习。' },
  { answer: '炉火纯青', meaning: '道家炼丹到炉火发出纯青色火焰时为成功，比喻功夫达到了纯熟完美的境界。' },
  { answer: '妙笔生花', meaning: '比喻杰出的写作才能，写出优美动人的文章。' },
  { answer: '目无全牛', meaning: '眼中没有完整的牛，只有牛的筋骨结构，形容技艺达到极纯熟的境界。' },
  { answer: '鹏程万里', meaning: '比喻前程远大，不可限量。' },
  { answer: '杞人忧天', meaning: '杞国有个人怕天塌下来，比喻不必要的忧虑。' },
  { answer: '事半功倍', meaning: '用一半的力气收到加倍的功效，形容费力小而收效大。' },
  { answer: '水滴石穿', meaning: '水滴不断可以穿透石头，比喻力量虽小但坚持不懈就能成功。' },
  { answer: '铁杵磨针', meaning: '把铁棒磨成细针，比喻只要有恒心肯努力，做任何事情都能成功。' },
  { answer: '望梅止渴', meaning: '望见梅子就流口水而止渴，比喻用空想来安慰自己。' },
  { answer: '闻鸡起舞', meaning: '听到鸡叫就起来舞剑，比喻有志报国的人及时奋起。' },
  { answer: '栩栩如生', meaning: '形容艺术形象非常生动逼真，像活的一样。' },
  { answer: '掩耳盗铃', meaning: '捂住耳朵去偷铃铛，比喻自己欺骗自己。' },
  { answer: '叶公好龙', meaning: '比喻口头上说爱好某事物，实际上并不真正爱好。' },
  { answer: '一箭双雕', meaning: '一箭射中两只雕，比喻做一件事达到两个目的。' },
  { answer: '以身作则', meaning: '用自己的行动做出榜样。' },
  { answer: '迎刃而解', meaning: '劈竹子时顺着刀口就裂开了，比喻主要问题解决了其他问题就很容易解决。' },
  { answer: '孜孜不倦', meaning: '勤奋努力，不知疲倦。' },
  { answer: '自相矛盾', meaning: '比喻自己的言行前后抵触。' },
  { answer: '走马观花', meaning: '骑在奔跑的马上看花，比喻粗略地观察事物。' },
  { answer: '班门弄斧', meaning: '在鲁班门前舞弄斧子，比喻在行家面前卖弄本领。' },
  { answer: '乘风破浪', meaning: '船只乘着风势破浪前进，比喻志向远大，不畏艰险，奋勇前进。' },
  { answer: '大器晚成', meaning: '大才需要长期磨炼才能有所成就，比喻能担当大事的人成就较晚。' },
  { answer: '登峰造极', meaning: '登上顶峰，比喻学问技艺等达到最高境界。' },
  { answer: '赴汤蹈火', meaning: '跳进滚水，踏着烈火，比喻不避艰险，奋不顾身。' },
  { answer: '高瞻远瞩', meaning: '站得高看得远，形容眼光远大。' },
  { answer: '集思广益', meaning: '集中众人的智慧，广泛吸收有益的意见。' },
  { answer: '坚持不懈', meaning: '坚持到底，毫不松懈。' },
  { answer: '苦口婆心', meaning: '比喻善意而又耐心地劝导。' },
  { answer: '滥竽充数', meaning: '不会吹竽的人混在乐队里充数，比喻没有本领的人混在行家里面充数。' },
  { answer: '毛遂自荐', meaning: '毛遂自己推荐自己，比喻自告奋勇，自我推荐。' },
  { answer: '旗开得胜', meaning: '军旗一展开战斗就取得胜利，比喻事情刚开始就获得成功。' },
  { answer: '如火如荼', meaning: '像火那样红，像荼那样白，形容旺盛热烈。' },
  { answer: '三顾茅庐', meaning: '比喻真心诚意地一再邀请或拜访有才能的人。' },
  { answer: '审时度势', meaning: '仔细研究时机，估量形势变化。' },
  { answer: '一丝不苟', meaning: '一点也不马虎，形容做事非常认真仔细。' },
  { answer: '异想天开', meaning: '形容想法非常奇怪，脱离实际。' },
  { answer: '有口皆碑', meaning: '所有人的嘴都是活的纪念碑，比喻人人称赞。' },
  { answer: '与日俱增', meaning: '随着时间一天一天地增长，形容不断增长。' },
  { answer: '斩钉截铁', meaning: '比喻说话做事坚决果断，毫不犹豫。' },
  { answer: '张灯结彩', meaning: '挂上灯笼系上彩绸，形容节日或有喜庆事情的景象。' },
  { answer: '知己知彼', meaning: '对自己和对方的情况都很了解，比喻全面掌握情况。' },
  { answer: '专心致志', meaning: '把心思全放在一件事上，形容一心一意，聚精会神。' },
  { answer: '捉襟见肘', meaning: '拉一拉衣襟就露出胳膊肘，形容衣服破烂，也比喻困难重重应付不过来。' },
  { answer: '足智多谋', meaning: '智谋很多，形容善于料事和用计。' },
  { answer: '百花齐放', meaning: '各种花卉一起开放，比喻不同形式和风格的艺术自由发展。' },
  { answer: '沧海桑田', meaning: '大海变成桑田，桑田变成大海，比喻世事变化很大。' },
  { answer: '单刀直入', meaning: '比喻说话直截了当，不绕弯子。' },
  { answer: '发愤图强', meaning: '下定决心，努力谋求强盛。' },
  { answer: '固若金汤', meaning: '形容工事无比坚固，防御牢不可破。' },
  { answer: '含辛茹苦', meaning: '形容忍受辛苦或吃尽苦头。' },
  { answer: '急中生智', meaning: '紧急的时候猛然想出办法。' },
  { answer: '举足轻重', meaning: '一抬脚就影响两边的轻重平衡，形容所处地位重要。' },
  { answer: '满载而归', meaning: '装得满满地回来，形容收获很大。' },
  { answer: '奇花异草', meaning: '稀奇少见的花草，比喻珍贵罕见的物品。' },
  { answer: '舍生取义', meaning: '为正义而牺牲生命。' },
  { answer: '任重道远', meaning: '担子很重路很远，比喻责任重大需要长期奋斗。' },
  { answer: '同心协力', meaning: '团结一致，共同努力。' },
  { answer: '息息相关', meaning: '呼吸也相互关联，形容彼此的关系非常密切。' },
  { answer: '兴高采烈', meaning: '兴致高情绪热烈，形容十分愉快。' },
  { answer: '雪中送炭', meaning: '下雪天给人送炭取暖，比喻在别人急需时给以物质上或精神上的帮助。' },
  { answer: '朝气蓬勃', meaning: '形容充满了生命力和活力。' },
  { answer: '众志成城', meaning: '万众一心，像坚固的城堡一样不可摧毁，比喻团结一致力量大。' },
  { answer: '博古通今', meaning: '对古代和现代的事都知道得很多，形容知识渊博。' },
  { answer: '风雨同舟', meaning: '在风雨中同乘一条船，比喻共同经历患难。' },
  { answer: '源远流长', meaning: '源头很远水流很长，比喻历史悠久根底深厚。' },
  { answer: '大公无私', meaning: '指办事公正，没有私心。' },
  { answer: '断章取义', meaning: '不顾全篇文章的内容，孤立地选取其中一段，指引用与原意不符。' },
  { answer: '人山人海', meaning: '人群如山似海，形容人聚集得非常多。' },
  { answer: '万象更新', meaning: '一切事物或景象都变得焕然一新。' },
  { answer: '全力以赴', meaning: '把全部力量都投入进去。' },
  { answer: '脚踏实地', meaning: '脚踏在坚实的土地上，比喻做事踏实认真。' },
  { answer: '虚怀若谷', meaning: '胸怀像山谷一样深广，形容十分谦虚。' },
  { answer: '标新立异', meaning: '提出新颖的见解，显示与众不同。' },
  { answer: '日新月异', meaning: '每天都在更新，每月都有变化，形容进步发展很快。' },
  { answer: '川流不息', meaning: '像河水一样流个不停，形容行人车马等来来往往接连不断。' },
  { answer: '从容不迫', meaning: '不慌不忙，沉着镇定。' },
  { answer: '独当一面', meaning: '单独负责一个方面的工作。' },
  { answer: '丰功伟绩', meaning: '伟大的功绩。' },
  { answer: '根深蒂固', meaning: '比喻基础深厚，不容易动摇。' },
  { answer: '焕然一新', meaning: '改变旧面貌，出现崭新的气象。' },
  { answer: '坚韧不拔', meaning: '形容意志坚定，不可动摇。' },
  { answer: '理直气壮', meaning: '理由充分，说话气势就壮。' },
  { answer: '力挽狂澜', meaning: '比喻竭力挽回危险的局势。' },
  { answer: '排山倒海', meaning: '推开高山翻倒大海，形容力量强盛声势浩大。' },
  { answer: '披星戴月', meaning: '身披星星头戴月亮，形容连夜奔波或早出晚归十分辛苦。' },
  { answer: '平分秋色', meaning: '比喻双方各得一半，不分上下。' },
  { answer: '前仆后继', meaning: '前面的倒下了后面的紧跟上去，形容斗争的英勇壮烈。' },
  { answer: '融会贯通', meaning: '把各方面的知识和道理融合贯穿起来，得到全面透彻的理解。' },
  { answer: '随遇而安', meaning: '能顺应各种环境，在任何境遇中都能满足。' },
  { answer: '谈笑风生', meaning: '谈话时有说有笑兴致很高，形容谈话谈得高兴而有风趣。' },
  { answer: '同甘共苦', meaning: '共同享受幸福，共同担当艰苦。' },
  { answer: '无微不至', meaning: '形容关怀照顾得非常细致周到。' },
  { answer: '相得益彰', meaning: '互相配合补充，更能显出各自的长处。' },
  { answer: '胸无城府', meaning: '形容待人接物坦率真诚，不隐藏心机。' },
  { answer: '一步登天', meaning: '一步就登上天，比喻一下子达到极高的境界或程度。' },
  { answer: '以德报怨', meaning: '用恩惠回报别人的怨恨，形容人宽容大度。' },
  { answer: '执法如山', meaning: '执行法律像山一样不可动摇。' },
  { answer: '变幻莫测', meaning: '变化很多，不能预料。' },
  { answer: '光明磊落', meaning: '心地光明坦白，毫无隐私。' },
  { answer: '名胜古迹', meaning: '风景优美或有古代遗迹的著名地方。' },
];

// Shuffle array
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build character → idiom index
function buildCharIndex(pool) {
  const idx = {};
  pool.forEach((idiom, i) => {
    for (let ci = 0; ci < idiom.answer.length; ci++) {
      const c = idiom.answer[ci];
      if (!idx[c]) idx[c] = [];
      idx[c].push({ poolIdx: i, charIdx: ci, idiom });
    }
  });
  return idx;
}

// Distractor characters
const distractorChars = '天地人风云雨雪冰霜山水木石金火土日月星斗江河湖海龙虎凤鹰马牛羊鱼鸟草木竹林田禾米谷城乡道路门窗户院子春夏秋冬早晚朝夕今古东西南北前后左右上下中正大小多少远近高低长短轻重快慢明暗冷热红白青绿黄蓝紫黑白赤橙红绿蓝黑白';

function pickDistractors(usedChars, count) {
  const available = distractorChars.split('').filter(c => !usedChars.includes(c));
  const shuffled = shuffle(available);
  return shuffled.slice(0, count).map(c => ({ text: c, length: 1 }));
}

/**
 * Build a crossword level by picking idioms that intersect with already-placed ones.
 * Uses character index to find candidates that share characters with placed idioms.
 */
function buildCrosswordLevel(levelId, difficulty, targetCount, maxRows, maxCols, unusedPool, charIdx) {
  const placedIdioms = [];
  const grid = {}; // "row,col" → char
  const usedFromPool = new Set(); // pool indices

  // Pick first idiom from unused pool
  const firstCandidates = unusedPool.filter((_, i) => !usedFromPool.has(i));
  if (firstCandidates.length === 0) return null;
  const first = firstCandidates[Math.floor(Math.random() * firstCandidates.length)];
  usedFromPool.add(unusedPool.indexOf(first));

  const firstRow = Math.floor(maxRows / 2);
  const firstCol = Math.max(0, Math.floor((maxCols - first.answer.length) / 2));

  placedIdioms.push({
    direction: 'horizontal',
    row: firstRow,
    startCol: firstCol,
    endCol: firstCol + first.answer.length - 1,
    answer: first.answer,
    meaning: first.meaning,
  });

  for (let ci = 0; ci < first.answer.length; ci++) {
    grid[`${firstRow},${firstCol + ci}`] = first.answer[ci];
  }

  // Keep placing idioms until we reach targetCount or can't place more
  let maxAttempts = targetCount * 20;
  while (placedIdioms.length < targetCount && maxAttempts-- > 0) {
    // Collect all characters currently on the grid with their positions
    const gridCells = Object.entries(grid).map(([key, char]) => {
      const [r, c] = key.split(',').map(Number);
      return { row: r, col: c, char };
    });

    // Shuffle to randomize which cell we try first
    const shuffledCells = shuffle(gridCells);
    let placedThisRound = false;

    for (const cell of shuffledCells) {
      if (placedThisRound) break;

      // Find idioms in the pool that contain this character
      const candidates = (charIdx[cell.char] || [])
        .filter(ci => !usedFromPool.has(ci.poolIdx));

      if (candidates.length === 0) continue;

      // Shuffle candidates and try each
      const shuffledCandidates = shuffle(candidates);

      for (const cand of shuffledCandidates) {
        if (placedThisRound) break;
        const idiom = cand.idiom;
        const charPos = cand.charIdx;

        // Determine which idiom directions already use this cell
        const existingDirs = new Set();
        for (const p of placedIdioms) {
          if (p.direction === 'horizontal') {
            if (p.row === cell.row && cell.col >= p.startCol && cell.col <= p.endCol) {
              existingDirs.add('horizontal');
            }
          } else {
            if (p.col === cell.col && cell.row >= p.startRow && cell.row <= p.endRow) {
              existingDirs.add('vertical');
            }
          }
        }

        // Try vertical if no vertical idiom uses this cell
        if (!existingDirs.has('vertical')) {
          const startRow = cell.row - charPos;
          if (startRow >= 0 && startRow + idiom.answer.length - 1 < maxRows) {
            let canPlace = true;
            for (let ci = 0; ci < idiom.answer.length; ci++) {
              const key = `${startRow + ci},${cell.col}`;
              if (grid[key] && grid[key] !== idiom.answer[ci]) {
                canPlace = false;
                break;
              }
            }
            if (canPlace) {
              placedIdioms.push({
                direction: 'vertical',
                startRow,
                endRow: startRow + idiom.answer.length - 1,
                col: cell.col,
                answer: idiom.answer,
                meaning: idiom.meaning,
              });
              for (let ci = 0; ci < idiom.answer.length; ci++) {
                grid[`${startRow + ci},${cell.col}`] = idiom.answer[ci];
              }
              usedFromPool.add(cand.poolIdx);
              placedThisRound = true;
            }
          }
        }

        // Try horizontal if no horizontal idiom uses this cell
        if (!placedThisRound && !existingDirs.has('horizontal')) {
          const startCol = cell.col - charPos;
          if (startCol >= 0 && startCol + idiom.answer.length - 1 < maxCols) {
            let canPlace = true;
            for (let ci = 0; ci < idiom.answer.length; ci++) {
              const key = `${cell.row},${startCol + ci}`;
              if (grid[key] && grid[key] !== idiom.answer[ci]) {
                canPlace = false;
                break;
              }
            }
            if (canPlace) {
              placedIdioms.push({
                direction: 'horizontal',
                row: cell.row,
                startCol,
                endCol: startCol + idiom.answer.length - 1,
                answer: idiom.answer,
                meaning: idiom.meaning,
              });
              for (let ci = 0; ci < idiom.answer.length; ci++) {
                grid[`${cell.row},${startCol + ci}`] = idiom.answer[ci];
              }
              usedFromPool.add(cand.poolIdx);
              placedThisRound = true;
            }
          }
        }
      }
    }

    if (!placedThisRound) break; // Can't place any more intersecting idioms
  }

  // Fallback: if we couldn't reach target, add non-intersecting idioms on free rows
  if (placedIdioms.length < targetCount) {
    const remaining = unusedPool.filter((_, i) => !usedFromPool.has(i));
    const shuffledRemaining = shuffle(remaining);

    for (const idiom of shuffledRemaining) {
      if (placedIdioms.length >= targetCount) break;

      // Try free rows for horizontal placement
      const usedRows = new Set();
      for (const p of placedIdioms) {
        if (p.direction === 'horizontal') usedRows.add(p.row);
        else for (let r = p.startRow; r <= p.endRow; r++) usedRows.add(r);
      }
      let placed = false;
      for (let r = 0; r < maxRows && !placed; r++) {
        if (usedRows.has(r)) continue;
        const sc = Math.max(0, Math.floor((maxCols - idiom.answer.length) / 2));
        let ok = true;
        for (let ci = 0; ci < idiom.answer.length; ci++) {
          if (grid[`${r},${sc + ci}`]) { ok = false; break; }
        }
        if (ok) {
          placedIdioms.push({
            direction: 'horizontal', row: r,
            startCol: sc, endCol: sc + idiom.answer.length - 1,
            answer: idiom.answer, meaning: idiom.meaning,
          });
          for (let ci = 0; ci < idiom.answer.length; ci++) {
            grid[`${r},${sc + ci}`] = idiom.answer[ci];
          }
          usedFromPool.add(unusedPool.indexOf(idiom));
          placed = true;
        }
      }

      // Try free columns for vertical
      if (!placed) {
        const usedCols = new Set();
        for (const p of placedIdioms) {
          if (p.direction === 'vertical') usedCols.add(p.col);
          else for (let c = p.startCol; c <= p.endCol; c++) usedCols.add(c);
        }
        for (let c = 0; c < maxCols && !placed; c++) {
          if (usedCols.has(c)) continue;
          const sr = Math.max(0, Math.floor((maxRows - idiom.answer.length) / 2));
          let ok = true;
          for (let ci = 0; ci < idiom.answer.length; ci++) {
            if (grid[`${sr + ci},${c}`]) { ok = false; break; }
          }
          if (ok) {
            placedIdioms.push({
              direction: 'vertical', startRow: sr,
              endRow: sr + idiom.answer.length - 1, col: c,
              answer: idiom.answer, meaning: idiom.meaning,
            });
            for (let ci = 0; ci < idiom.answer.length; ci++) {
              grid[`${sr + ci},${c}`] = idiom.answer[ci];
            }
            usedFromPool.add(unusedPool.indexOf(idiom));
            placed = true;
          }
        }
      }
    }
  }

  // Calculate effective grid dimensions from placed idioms
  let minR = Infinity, maxR = -Infinity;
  let minC = Infinity, maxC = -Infinity;
  for (const idiom of placedIdioms) {
    if (idiom.direction === 'horizontal') {
      minR = Math.min(minR, idiom.row);
      maxR = Math.max(maxR, idiom.row);
      minC = Math.min(minC, idiom.startCol);
      maxC = Math.max(maxC, idiom.endCol);
    } else {
      minR = Math.min(minR, idiom.startRow);
      maxR = Math.max(maxR, idiom.endRow);
      minC = Math.min(minC, idiom.col);
      maxC = Math.max(maxC, idiom.col);
    }
  }
  // Add some margin
  minR = Math.max(0, minR);
  minC = Math.max(0, minC);
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;

  // Normalize positions to start from 0,0
  for (const idiom of placedIdioms) {
    if (idiom.direction === 'horizontal') {
      idiom.row -= minR;
      idiom.startCol -= minC;
      idiom.endCol -= minC;
    } else {
      idiom.startRow -= minR;
      idiom.endRow -= minR;
      idiom.col -= minC;
    }
  }

  // Rebuild normalized grid
  const normGrid = {};
  for (const key of Object.keys(grid)) {
    const [r, c] = key.split(',').map(Number);
    normGrid[`${r - minR},${c - minC}`] = grid[key];
  }

  // Pick fixed cell — first character of first idiom
  const firstPlaced = placedIdioms[0];
  let fixedRow, fixedCol, fixedChar;
  if (firstPlaced.direction === 'horizontal') {
    fixedRow = firstPlaced.row;
    fixedCol = firstPlaced.startCol;
    fixedChar = firstPlaced.answer[0];
  } else {
    fixedRow = firstPlaced.startRow;
    fixedCol = firstPlaced.col;
    fixedChar = firstPlaced.answer[0];
  }
  const fixedCells = [{ row: fixedRow, col: fixedCol, char: fixedChar }];

  // Generate fragments: one per grid cell (deduplicated by position)
  const fragmentMap = {};
  for (const idiom of placedIdioms) {
    const chars = idiom.answer.split('');
    if (idiom.direction === 'horizontal') {
      for (let ci = 0; ci < chars.length; ci++) {
        const posKey = `${idiom.row},${idiom.startCol + ci}`;
        if (!fragmentMap[posKey]) {
          fragmentMap[posKey] = {
            text: chars[ci],
            length: 1,
            positions: [[idiom.row, idiom.startCol + ci]],
          };
        }
      }
    } else {
      for (let ci = 0; ci < chars.length; ci++) {
        const posKey = `${idiom.startRow + ci},${idiom.col}`;
        if (!fragmentMap[posKey]) {
          fragmentMap[posKey] = {
            text: chars[ci],
            length: 1,
            positions: [[idiom.startRow + ci, idiom.col]],
          };
        }
      }
    }
  }

  // Remove fixed cell from fragments
  const fixedKey = `${fixedRow},${fixedCol}`;
  delete fragmentMap[fixedKey];

  const fragments = Object.values(fragmentMap);

  const usedChars = new Set(fragments.map(f => f.text));
  usedChars.add(fixedChar);

  const numDistractors = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : difficulty === 'hard' ? 5 : 6;
  const distractors = pickDistractors([...usedChars], numDistractors);

  const totalFrags = fragments.length;
  const minScore = difficulty === 'easy' ? totalFrags * 18 :
                   difficulty === 'medium' ? totalFrags * 22 :
                   difficulty === 'hard' ? totalFrags * 28 : totalFrags * 24;

  return {
    level_id: levelId,
    rows,
    cols,
    difficulty,
    min_score: minScore,
    fixed_cells: fixedCells,
    idioms: placedIdioms,
    fragments,
    distractors,
  };
}

// === Generate 100 crossword levels ===
function generateAllLevels() {
  const levels = [];
  const charIdx = buildCharIndex(idiomPool);

  function makeLevel(id, difficulty, targetCount, maxRows, maxCols) {
    // Try up to 5 times with different random seeds
    for (let attempt = 0; attempt < 5; attempt++) {
      const lvl = buildCrosswordLevel(id, difficulty, targetCount, maxRows, maxCols, idiomPool, charIdx);
      if (lvl && lvl.idioms.length >= 3) return lvl;
    }
    // Last resort: force at least 3
    return buildCrosswordLevel(id, difficulty, Math.max(3, targetCount), maxRows + 2, maxCols + 2, idiomPool, charIdx);
  }

  // Levels 101-120: Easy crosswords (3-4 idioms, 4×5 to 5×5)
  for (let i = 0; i < 10; i++) {
    const lvl = makeLevel(i + 101, 'easy', 3, 4, 5);
    if (lvl) levels.push(lvl);
  }
  for (let i = 0; i < 10; i++) {
    const lvl = makeLevel(i + 111, 'easy', 4, 5, 5);
    if (lvl) levels.push(lvl);
  }

  // Levels 121-145: Medium crosswords (4-5 idioms, 5×6)
  for (let i = 0; i < 10; i++) {
    const lvl = makeLevel(i + 121, 'medium', 4, 5, 6);
    if (lvl) levels.push(lvl);
  }
  for (let i = 0; i < 15; i++) {
    const lvl = makeLevel(i + 131, 'medium', 5, 6, 6);
    if (lvl) levels.push(lvl);
  }

  // Levels 146-175: Hard crosswords (5-6 idioms, 6×7)
  for (let i = 0; i < 15; i++) {
    const lvl = makeLevel(i + 146, 'hard', 5, 6, 7);
    if (lvl) levels.push(lvl);
  }
  for (let i = 0; i < 15; i++) {
    const lvl = makeLevel(i + 161, 'hard', 6, 7, 7);
    if (lvl) levels.push(lvl);
  }

  // Levels 176-200: Expert crosswords (6-7 idioms, 7×8)
  for (let i = 0; i < 15; i++) {
    const lvl = makeLevel(i + 176, 'hard', 6, 7, 8);
    if (lvl) levels.push(lvl);
  }
  for (let i = 0; i < 10; i++) {
    const lvl = makeLevel(i + 191, 'hard', 7, 7, 8);
    if (lvl) levels.push(lvl);
  }

  return levels;
}

// Generate
const crosswordLevels = generateAllLevels();
const jsonPath = path.join(__dirname, 'crosswordLevels.json');
fs.writeFileSync(jsonPath, JSON.stringify(crosswordLevels, null, 2));
console.log(`Generated ${crosswordLevels.length} crossword levels in crosswordLevels.json`);

// Also output stats
const byDiff = {};
crosswordLevels.forEach(l => {
  byDiff[l.difficulty] = (byDiff[l.difficulty] || 0) + 1;
});
console.log('By difficulty:', JSON.stringify(byDiff));
crosswordLevels.slice(0, 5).forEach(l => {
  console.log(`  Level ${l.level_id}: ${l.difficulty} ${l.rows}×${l.cols} idioms=${l.idioms.length} frags=${l.fragments.length} dist=${l.distractors.length}`);
});
