// server/data/vocab.js — 種子單字資料（N5~N1 範例）
// 生產環境請替換為資料庫查詢

/**
 * @typedef {Object} VocabItem
 * @property {string} id
 * @property {string} kanji
 * @property {string} reading
 * @property {string} meaning
 * @property {'N5'|'N4'|'N3'|'N2'|'N1'} level
 * @property {string} pos - 詞性
 * @property {Array<{sentence:string, reading:string, translation:string}>} examples
 */

/** @type {VocabItem[]} */
export const vocabData = [
  // ── N5 ──────────────────────────────────────────────────────
  { id:'v001', kanji:'水',     reading:'みず',          meaning:'水 (water)',    level:'N5', pos:'noun',
    examples:[{ sentence:'水を飲む。', reading:'みずをのむ。', translation:'喝水。' }] },
  { id:'v002', kanji:'食べる', reading:'たべる',         meaning:'吃 (to eat)',   level:'N5', pos:'verb',
    examples:[{ sentence:'ご飯を食べる。', reading:'ごはんをたべる。', translation:'吃飯。' }] },
  { id:'v003', kanji:'大きい', reading:'おおきい',       meaning:'大的 (big)',    level:'N5', pos:'adj',
    examples:[{ sentence:'大きい犬。', reading:'おおきいいぬ。', translation:'大狗。' }] },
  { id:'v004', kanji:'学校',   reading:'がっこう',       meaning:'學校 (school)', level:'N5', pos:'noun',
    examples:[{ sentence:'学校へ行く。', reading:'がっこうへいく。', translation:'去學校。' }] },
  { id:'v005', kanji:'見る',   reading:'みる',           meaning:'看 (to see)',   level:'N5', pos:'verb',
    examples:[{ sentence:'テレビを見る。', reading:'テレビをみる。', translation:'看電視。' }] },

  // ── N4 ──────────────────────────────────────────────────────
  { id:'v006', kanji:'集める', reading:'あつめる',       meaning:'收集 (to collect)', level:'N4', pos:'verb',
    examples:[{ sentence:'切手を集める。', reading:'きってをあつめる。', translation:'收集郵票。' }] },
  { id:'v007', kanji:'経験',   reading:'けいけん',       meaning:'經驗 (experience)', level:'N4', pos:'noun',
    examples:[{ sentence:'経験を積む。', reading:'けいけんをつむ。', translation:'累積經驗。' }] },
  { id:'v008', kanji:'説明',   reading:'せつめい',       meaning:'說明 (explanation)',level:'N4', pos:'noun',
    examples:[{ sentence:'詳しく説明する。', reading:'くわしくせつめいする。', translation:'詳細說明。' }] },

  // ── N3 ──────────────────────────────────────────────────────
  { id:'v009', kanji:'重力',   reading:'じゅうりょく',   meaning:'重力 (gravity)',    level:'N3', pos:'noun',
    examples:[{ sentence:'重力の影響を受ける。', reading:'じゅうりょくのえいきょうをうける。', translation:'受到重力影響。' }] },
  { id:'v010', kanji:'浮かぶ', reading:'うかぶ',          meaning:'漂浮 (to float)',   level:'N3', pos:'verb',
    examples:[{ sentence:'雲が空に浮かぶ。', reading:'くもがそらにうかぶ。', translation:'雲朵漂浮在天空。' }] },
  { id:'v011', kanji:'仮説',   reading:'かせつ',          meaning:'假說 (hypothesis)', level:'N3', pos:'noun',
    examples:[{ sentence:'仮説を立てる。', reading:'かせつをたてる。', translation:'建立假說。' }] },

  // ── N2 ──────────────────────────────────────────────────────
  { id:'v012', kanji:'概念',   reading:'がいねん',       meaning:'概念 (concept)',    level:'N2', pos:'noun',
    examples:[{ sentence:'抽象的な概念。', reading:'ちゅうしょうてきながいねん。', translation:'抽象概念。' }] },
  { id:'v013', kanji:'微妙',   reading:'びみょう',       meaning:'微妙 (subtle)',     level:'N2', pos:'adj',
    examples:[{ sentence:'微妙な違い。', reading:'びみょうなちがい。', translation:'細微的差異。' }] },

  // ── N1 ──────────────────────────────────────────────────────
  { id:'v014', kanji:'逡巡',   reading:'しゅんじゅん',   meaning:'躊躇、猶豫 (hesitation)', level:'N1', pos:'noun',
    examples:[{ sentence:'逡巡して決断できない。', reading:'しゅんじゅんしてけつだんできない。', translation:'猶豫不決。' }] },
  { id:'v015', kanji:'俯瞰',   reading:'ふかん',          meaning:'俯瞰 (bird\'s-eye view)', level:'N1', pos:'noun',
    examples:[{ sentence:'全体を俯瞰する。', reading:'ぜんたいをふかんする。', translation:'從全局俯瞰。' }] },
]

/**
 * 依等級過濾單字，支援多選等級
 * @param {string|string[]} level - 'N5', ['N5','N4'] 等
 * @param {number} count
 * @returns {VocabItem[]}
 */
export function getVocabByLevel(level, count = 10) {
  const levels = Array.isArray(level) ? level : [level]
  const filtered = vocabData.filter(v => levels.includes(v.level))
  // 隨機洗牌後取前 count 個
  return shuffle(filtered).slice(0, count)
}

/** Fisher-Yates 洗牌 */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
