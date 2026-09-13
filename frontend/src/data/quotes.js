/**
 * 「拾句」句集
 *
 * 来源：以下音乐人已公开发行的歌词与公开语录，逐条人工筛选，
 * 只保留无脏话、无暴力与炫富指向、适合长文站点气质的句子。
 *
 *   Kendrick Lamar / Frank Ocean / Kanye West / J. Cole / Nas / Jay-Z
 *   夏之禹 / SASIOVERLXRD / 连麻Swimming / JinJiBeWater_隼 / Shing02
 *
 * 字段：
 *   text   句子正文（中文按原词，英文保留原文）
 *   author 署名（合作曲目两位都写）
 *   work   出处作品，用于悬停与副标题
 */

export const QUOTES = [
  /* ---------- Kendrick Lamar ---------- */
  { text: 'We gon\' be alright.', author: 'Kendrick Lamar', work: 'Alright' },
  { text: 'If I told you that a flower bloomed in a dark room, would you trust it?', author: 'Kendrick Lamar', work: 'Poetic Justice' },
  { text: 'I got a bone to pick with the world, and I brought a fork.', author: 'Kendrick Lamar', work: 'Public 语录' },

  /* ---------- Frank Ocean ---------- */
  { text: "I'm sure we're taller in another dimension.", author: 'Frank Ocean', work: 'White Ferrari' },
  { text: "I'd rather live outside than inside the lines.", author: 'Frank Ocean', work: 'Seigfried' },
  { text: 'Every day is a new day, and I am grateful for the air I breathe.', author: 'Frank Ocean', work: 'Public 语录' },

  /* ---------- Kanye West ---------- */
  { text: "Everything I'm not made me everything I am.", author: 'Kanye West', work: 'Everything I Am' },
  { text: "We're all self-conscious. I'm just the first to admit it.", author: 'Kanye West', work: 'All Falls Down' },
  { text: "Having money's not everything. Not having it is.", author: 'Kanye West', work: 'Good Life' },

  /* ---------- J. Cole ---------- */
  { text: "There's no such thing as a life that's better than yours.", author: 'J. Cole', work: 'Love Yourz' },
  { text: 'Love yours. No need to look at what the next man has.', author: 'J. Cole', work: 'Love Yourz' },
  { text: 'Anything that is worth having is worth working for twice as hard.', author: 'J. Cole', work: 'Public 语录' },

  /* ---------- Nas ---------- */
  { text: "I know I can be what I wanna be. If I work hard at it, I'll be where I wanna be.", author: 'Nas', work: 'I Can' },
  { text: 'The world is yours.', author: 'Nas', work: 'The World Is Yours' },
  { text: "No idea's original. There's nothing new under the sun.", author: 'Nas', work: "No Idea's Original" },

  /* ---------- Jay-Z ---------- */
  { text: "I'm not a businessman. I'm a business, man.", author: 'JAY-Z', work: 'Diamonds From Sierra Leone (Remix)' },
  { text: 'Difficult takes a day. Impossible takes a week.', author: 'JAY-Z', work: 'Dead Presidents II' },
  { text: 'You can want success all you want, but to get it, you have to work.', author: 'JAY-Z', work: 'Public 语录' },

  /* ---------- 夏之禹 ---------- */
  { text: '时间是虚无的概念，房间也是宇宙。', author: '夏之禹', work: 'We Can Be Chilling' },
  { text: '文字是你最擅长的工具，但功利是这人群的风气。', author: '夏之禹', work: 'We Can Be Chilling' },
  { text: '把田野看作都市，再把都市看作田野——文明的答案不过是人与土地的和解。', author: '夏之禹', work: '在希望的田野上' },
  { text: '看过霓虹的绚烂，喝过五彩的酒，见过最有趣的人们，牵过最暖的手。', author: '夏之禹', work: '在希望的田野上' },
  { text: '偶尔晴的天气，书本夹着烟蒂，没写完的诗集。', author: '夏之禹', work: 'Young Fresh Chin' },
  { text: '人生冗长，只想一头扎进她的海洋。', author: '夏之禹', work: '殉情' },

  /* ---------- SASIOVERLXRD ---------- */
  { text: '每个人都有他逃不开的深渊，你是不敢看还是不敢走远。', author: 'SASIOVERLXRD', work: '少年深渊' },
  { text: '人就是会自己囚禁自己的笼中鸟。', author: 'SASIOVERLXRD', work: '四川街尼' },
  { text: '死亡不是生命的终点。', author: 'SASIOVERLXRD', work: '死亡不是生命的终点' },

  /* ---------- 连麻Swimming / JinJiBeWater_隼 ---------- */
  { text: '世界本无神，信的多了成了神。', author: '连麻Swimming / JinJiBeWater_隼', work: '真假美猴王' },
  { text: '没有痛就感受不到爱，是我自找。', author: '连麻Swimming / JinJiBeWater_隼', work: '真假美猴王' },
  { text: '生我不能欢笑，灭我不减狂骄。', author: '连麻Swimming / JinJiBeWater_隼', work: '真假美猴王' },
  { text: '他出身就是为书写不可能的可能。', author: '连麻Swimming / JinJiBeWater_隼', work: '数钱的女孩' },

  /* ---------- Shing02 ---------- */
  { text: "The rhymes will heal, 'cause I believe in music.", author: 'Shing02', work: 'Luv(sic)' },
  { text: 'Imagination brings bliss at no cost.', author: 'Shing02', work: 'Luv(sic) Part 2' },
  { text: 'Exhale, inhale. Accelerate, exhilarate.', author: 'Shing02', work: 'On the Run' },
  { text: 'Every song has a sequel — never same, everything but the name.', author: 'Shing02', work: 'Luv(sic) Part 2' },
];

export default QUOTES;
