// server/data/articles.js — 種子文章資料 + 每日推薦算法

/**
 * @typedef {Object} Article
 * @property {string} id
 * @property {string} title
 * @property {string} content       - 含振假名的 HTML 字串
 * @property {'N5'|'N4'|'N3'|'N2'|'N1'} level
 * @property {string} topic
 * @property {number} wordCount
 * @property {string} publishedAt   - ISO 日期字串
 */

/** @type {Article[]} */
export const articlesData = [
  {
    id: 'a001', level: 'N5', topic: '日常生活', wordCount: 85,
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    title: '私の一日 (わたしのいちにち)',
    content: `<p>私は毎朝<ruby>七<rt>しち</rt></ruby>時に<ruby>起<rt>お</rt></ruby>きます。
      <ruby>朝<rt>あさ</rt></ruby>ごはんを<ruby>食<rt>た</rt></ruby>べて、
      <ruby>学校<rt>がっこう</rt></ruby>へ<ruby>行<rt>い</rt></ruby>きます。
      <ruby>学校<rt>がっこう</rt></ruby>は<ruby>楽<rt>たの</rt></ruby>しいです。
      <ruby>友達<rt>ともだち</rt></ruby>と<ruby>話<rt>はな</rt></ruby>したり、
      <ruby>勉強<rt>べんきょう</rt></ruby>したりします。</p>`
  },
  {
    id: 'a002', level: 'N4', topic: '文化', wordCount: 145,
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    title: '日本の<ruby>祭<rt>まつ</rt></ruby>り',
    content: `<p>日本には<ruby>様々<rt>さまざま</rt></ruby>な<ruby>祭<rt>まつ</rt></ruby>りがあります。
      <ruby>夏<rt>なつ</rt></ruby>には<ruby>花火大会<rt>はなびたいかい</rt></ruby>が
      <ruby>開<rt>ひら</rt></ruby>かれ、<ruby>多<rt>おお</rt></ruby>くの<ruby>人<rt>ひと</rt></ruby>が
      <ruby>浴衣<rt>ゆかた</rt></ruby>を<ruby>着<rt>き</rt></ruby>て<ruby>集<rt>あつ</rt></ruby>まります。
      これらの<ruby>行事<rt>ぎょうじ</rt></ruby>は日本の<ruby>文化<rt>ぶんか</rt></ruby>を
      <ruby>伝<rt>つた</rt></ruby>える<ruby>大切<rt>たいせつ</rt></ruby>な<ruby>役割<rt>やくわり</rt></ruby>を
      <ruby>担<rt>にな</rt></ruby>っています。</p>`
  },
  {
    id: 'a003', level: 'N3', topic: '科学', wordCount: 210,
    publishedAt: new Date().toISOString(),
    title: '<ruby>重力<rt>じゅうりょく</rt></ruby>と宇宙',
    content: `<p>アイザック・ニュートンは<ruby>重力<rt>じゅうりょく</rt></ruby>の
      <ruby>法則<rt>ほうそく</rt></ruby>を<ruby>発見<rt>はっけん</rt></ruby>しました。
      <ruby>重力<rt>じゅうりょく</rt></ruby>とは、<ruby>質量<rt>しつりょう</rt></ruby>を
      <ruby>持<rt>も</rt></ruby>つもの<ruby>同士<rt>どうし</rt></ruby>が<ruby>互<rt>たが</rt></ruby>いに
      <ruby>引<rt>ひ</rt></ruby>き<ruby>合<rt>あ</rt></ruby>う<ruby>力<rt>ちから</rt></ruby>です。
      <ruby>宇宙<rt>うちゅう</rt></ruby>では<ruby>重力<rt>じゅうりょく</rt></ruby>がなければ、
      <ruby>惑星<rt>わくせい</rt></ruby>や<ruby>星<rt>ほし</rt></ruby>は<ruby>形成<rt>けいせい</rt></ruby>されません。</p>`
  },
  {
    id: 'a004', level: 'N2', topic: '社会', wordCount: 320,
    publishedAt: new Date().toISOString(),
    title: '少子化問題と<ruby>対策<rt>たいさく</rt></ruby>',
    content: `<p>日本の<ruby>少子化<rt>しょうしか</rt></ruby>は<ruby>深刻<rt>しんこく</rt></ruby>な
      <ruby>社会問題<rt>しゃかいもんだい</rt></ruby>となっています。<ruby>出生率<rt>しゅっしょうりつ</rt></ruby>の
      <ruby>低下<rt>ていか</rt></ruby>により、<ruby>労働力<rt>ろうどうりょく</rt></ruby>の<ruby>不足<rt>ふそく</rt></ruby>や
      <ruby>社会保障<rt>しゃかいほしょう</rt></ruby>の<ruby>維持<rt>いじ</rt></ruby>が
      <ruby>困難<rt>こんなん</rt></ruby>になっています。</p>`
  },
  {
    id: 'a005', level: 'N1', topic: '哲学', wordCount: 450,
    publishedAt: new Date().toISOString(),
    title: '存在と時間の<ruby>哲学<rt>てつがく</rt></ruby>',
    content: `<p>ハイデガーの<ruby>存在論<rt>そんざいろん</rt></ruby>は、
      「<ruby>存在<rt>そんざい</rt></ruby>とは何か」という<ruby>根本的<rt>こんぽんてき</rt></ruby>な
      <ruby>問<rt>とい</rt></ruby>から<ruby>出発<rt>しゅっぱつ</rt></ruby>します。
      <ruby>現存在<rt>げんそんざい</rt></ruby>（ダーザイン）の<ruby>概念<rt>がいねん</rt></ruby>は、
      <ruby>人間<rt>にんげん</rt></ruby>が<ruby>世界<rt>せかい</rt></ruby>に
      <ruby>投<rt>な</rt></ruby>げ<ruby>込<rt>こ</rt></ruby>まれた<ruby>存在<rt>そんざい</rt></ruby>であることを
      <ruby>示<rt>しめ</rt></ruby>しています。</p>`
  }
]

/**
 * 每日推薦文章算法：依用戶等級評分排序
 * @param {'N5'|'N4'|'N3'|'N2'|'N1'} userLevel
 * @param {string[]} recentReadIds - 最近已讀文章 ID（排除重複）
 * @returns {Article[]} 最多 3 篇推薦
 */
export function getDailyArticles(userLevel, recentReadIds = []) {
  const levelOrder = ['N5','N4','N3','N2','N1']
  const userIdx    = levelOrder.indexOf(userLevel)

  const scored = articlesData
    .filter(a => !recentReadIds.includes(a.id))
    .map(a => {
      const aIdx       = levelOrder.indexOf(a.level)
      const levelDiff  = Math.abs(aIdx - userIdx)
      // 同等級最高分，差一級扣20分，確保有一定挑戰性
      const levelScore = Math.max(0, 100 - levelDiff * 20)
      // 新鮮度：越新越高（最多加 30 分）
      const daysOld   = (Date.now() - new Date(a.publishedAt).getTime()) / 86400000
      const freshScore = Math.max(0, 30 - daysOld * 10)

      return { ...a, _score: levelScore + freshScore }
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)

  return scored.map(({ _score, ...a }) => a)
}
