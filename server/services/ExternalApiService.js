// server/services/ExternalApiService.js
// 統一外部 API 請求層：快取 + 錯誤處理 + 原始/處理後資料區分
//
// 命名規範（無 TypeScript，以前綴區分）：
//   rawXxx     — 外部 API 回傳的原始資料（未處理）
//   cleanedXxx — 我們清洗/格式化後的統一格式

import NodeCache from 'node-cache'
import fetch     from 'node-fetch'

// ── 快取實例（TTL 10 分鐘，每 2 分鐘自動清理過期 key）
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 })

// ── 常數 ───────────────────────────────────────────────
const JISHO_BASE = 'https://jisho.org/api/v1'
const NHK_RSS    = 'https://www3.nhk.or.jp/news/easy/news-list.json'
const FETCH_TIMEOUT_MS = 8000

// ── 漢字難度分析表（用於自動 N 等級標注）────────────────
/**
 * 各等級常見漢字集合（字符 Set）。
 * 外部資料沒有 JLPT 標籤時，我們逐字掃描決定難度。
 *
 * 技術構想說明：
 *   1. 拆解單字/文章中的每個漢字
 *   2. 從 N5→N1 順序查表，找到第一個「這個字不屬於更低等級」的命中
 *   3. weighted score = sum(level_weight) / char_count
 *   4. 加權後映射到最終等級（見 inferJlptLevel）
 */
const KANJI_LEVEL_MAP = {
  N5: new Set('日一国人年大十二本中長出三時行見月後前生五間上東四今金九入学高円子外八六下来気小七山話女北午百書先名川千水半男西電校語土木聞食車何南万毎白天母火右読友左休父雨'),
  N4: new Set('会同事自社発者地業方新場員立開手力問代明動京目通言理体田主題意不作用度強公持野以思家世多正安院心界教文元重近考画海売知道集別物使品計死特私始朝運終台広住真有無料場合'),
  N3: new Set('化部情況投者定代法制政経実形標準的合働保要加速存続増完変革議院制府省庁委員委議員評価対応型式普及環境整備産業支援推進促進実現達成確保提供活性普及共有ただし'),
  N2: new Set('概念抽象複雑微妙曖昧傾向傾斜推測仮説論文論議論理批判批評批判批評批判批評'),
  N1: new Set('哲邪慄憂鬱葛藤懐疑忌憚惰憤慨憤懣憧憬怨嗟嘆凄惨戦慄惨憺憫')
}

/**
 * 自動推斷 JLPT 等級（無外部標籤時使用）
 * @param {string} text - 日文文字（單字、句子、文章片段）
 * @returns {'N5'|'N4'|'N3'|'N2'|'N1'}
 */
export function inferJlptLevel(text) {
  const kanji     = [...text].filter(c => /[\u4e00-\u9faf]/.test(c))
  if (kanji.length === 0) return 'N5'  // 平假名片假名 → 入門

  // 每個漢字打分：N5=1, N4=2, N3=3, N2=4, N1=5
  const weights = { N5:1, N4:2, N3:3, N2:4, N1:5 }
  let totalScore = 0

  for (const ch of kanji) {
    let charLevel = 'N1'  // 預設最難（未知漢字視為 N1）
    for (const level of ['N5','N4','N3','N2','N1']) {
      if (KANJI_LEVEL_MAP[level].has(ch)) { charLevel = level; break }
    }
    totalScore += weights[charLevel]
  }

  const avg = totalScore / kanji.length
  if (avg <= 1.4) return 'N5'
  if (avg <= 2.2) return 'N4'
  if (avg <= 3.0) return 'N3'
  if (avg <= 3.8) return 'N2'
  return 'N1'
}

// ═══════════════════════════════════════════════════════
// 通用 HTTP Fetch（帶 timeout + retry）
// ═══════════════════════════════════════════════════════
/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {number} [retries=1]
 * @returns {Promise<any>} rawData
 */
async function fetchWithTimeout(url, options = {}, retries = 1) {
  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
    // 回傳原始 JSON（rawData）
    const rawData = await res.json()
    return rawData
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 500))
      return fetchWithTimeout(url, options, retries - 1)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ═══════════════════════════════════════════════════════
// Jisho API — 單字查詢
// ═══════════════════════════════════════════════════════

/**
 * 從 Jisho API 查詢單字，回傳清洗後的格式
 * @param {string} keyword - 搜尋關鍵字（日文或英文）
 * @param {number} [limit=10]
 * @returns {Promise<CleanedVocabItem[]>}
 *
 * @typedef {Object} CleanedVocabItem
 * @property {string} id         - `jisho-${slug}`
 * @property {string} kanji      - 漢字寫法（或讀假名）
 * @property {string} reading    - 平假名讀音
 * @property {string} meaning    - 中文／英文意思（第一個）
 * @property {string[]} meanings - 所有意思
 * @property {string[]} tags     - JLPT 等級、詞性等
 * @property {'N5'|'N4'|'N3'|'N2'|'N1'} level - 推斷的 JLPT 等級
 * @property {'jisho'} source    - 資料來源標記
 */
export async function searchVocab(keyword, limit = 10) {
  const cacheKey = `vocab:${keyword}:${limit}`
  const cached   = cache.get(cacheKey)
  if (cached) return cached   // 快取命中：< 1ms

  const encodedKeyword = encodeURIComponent(keyword)
  // rawData = Jisho 原始回傳（未處理）
  const rawData = await fetchWithTimeout(
    `${JISHO_BASE}/search/words?keyword=${encodedKeyword}`
  )

  const rawItems = rawData?.data?.slice(0, limit) || []

  // 清洗原始資料 → cleanedItems（處理後）
  const cleanedItems = rawItems.map(rawItem => {
    const japanese = rawItem.japanese?.[0] || {}
    const senses   = rawItem.senses || []

    const kanji   = japanese.word    || japanese.reading || '—'
    const reading = japanese.reading || kanji

    // 意思：英文 → 我們直接回傳英文 + 簡單標注
    const meanings    = senses.flatMap(s => s.english_definitions || [])
    const firstMeaning = meanings[0] || '（暫無釋義）'

    // JLPT 等級：Jisho 有時提供，否則推斷
    const jishoLevel = rawItem.jlpt?.[0]?.replace('jlpt-', '').toUpperCase() || null
    const level = jishoLevel && ['N5','N4','N3','N2','N1'].includes(jishoLevel)
      ? jishoLevel
      : inferJlptLevel(kanji)

    const tags = [
      ...( rawItem.jlpt || [] ).map(j => j.replace('jlpt-', '').toUpperCase()),
      ...senses.flatMap(s => s.parts_of_speech || []).slice(0, 2)
    ]

    /** @type {CleanedVocabItem} */
    return {
      id:       `jisho-${kanji}-${reading}`,
      kanji,
      reading,
      meaning:  firstMeaning,
      meanings: meanings.slice(0, 5),
      tags,
      level,
      source: 'jisho'
    }
  })

  cache.set(cacheKey, cleanedItems)
  return cleanedItems
}

// ═══════════════════════════════════════════════════════
// NHK News Web Easy — 文章列表 + 分級
// ═══════════════════════════════════════════════════════

/**
 * 取得 NHK Easy News 列表，按等級過濾
 * @param {string} [filterLevel] - 'N5'~'N1'，不傳則全部
 * @param {number} [limit=10]
 * @returns {Promise<CleanedArticle[]>}
 *
 * @typedef {Object} CleanedArticle
 * @property {string} id
 * @property {string} title       - 標題（含振假名 HTML）
 * @property {string} rawTitle    - 純文字標題（供分級分析）
 * @property {string} url         - NHK 原始連結
 * @property {string} imageUrl    - 封面圖
 * @property {string} publishedAt - ISO 日期
 * @property {'N5'|'N4'|'N3'|'N2'|'N1'} level
 * @property {string} topic       - 推斷的主題分類
 * @property {number} wordCount   - 估算字數
 * @property {'nhk'} source
 */
export async function fetchNhkArticles(filterLevel = null, limit = 10) {
  const cacheKey = `nhk:${filterLevel || 'all'}:${limit}`
  const cached   = cache.get(cacheKey)
  if (cached) return cached

  // NHK Easy News 提供 JSON 格式的新聞列表
  const rawData = await fetchWithTimeout(NHK_RSS)

  // rawData 是一個日期→文章陣列的物件
  const rawArticles = Object.values(rawData).flat().slice(0, 50)

  /** @type {CleanedArticle[]} */
  const cleanedArticles = rawArticles.map(rawItem => {
    // NHK 原始欄位名稱：news_id, title, news_prearranged_time, top_page_image, news_web_image_uri
    const rawTitle  = rawItem.title || ''
    const level     = inferJlptLevel(rawTitle)
    const wordCount = rawTitle.length * 8  // 粗略估算（標題 8 倍 ≈ 全文字數）

    // 主題推斷（簡單關鍵字比對）
    const topic = inferTopic(rawTitle)

    return {
      id:          `nhk-${rawItem.news_id}`,
      title:       rawTitle,
      rawTitle,
      url:         `https://www3.nhk.or.jp/news/easy/${rawItem.news_id}/${rawItem.news_id}.html`,
      imageUrl:    rawItem.top_page_image || rawItem.news_web_image_uri || '',
      publishedAt: rawItem.news_prearranged_time || new Date().toISOString(),
      level,
      topic,
      wordCount,
      source: 'nhk'
    }
  })

  const filtered = filterLevel
    ? cleanedArticles.filter(a => a.level === filterLevel)
    : cleanedArticles

  const result = filtered.slice(0, limit)
  cache.set(cacheKey, result)
  return result
}

/**
 * 主題推斷（關鍵字比對）
 * @param {string} title
 * @returns {string}
 */
function inferTopic(title) {
  const topicMap = [
    { keywords: ['経済','株','円','ドル','市場','景気'], topic: '経済' },
    { keywords: ['政治','選挙','国会','政府','大臣'],   topic: '政治' },
    { keywords: ['スポーツ','野球','サッカー','オリンピック'], topic: 'スポーツ' },
    { keywords: ['科学','研究','発見','宇宙','AI'],     topic: '科学' },
    { keywords: ['文化','映画','音楽','アート','歴史'], topic: '文化' },
    { keywords: ['災害','地震','台風','洪水'],          topic: '災害' },
    { keywords: ['健康','病気','医療','ウイルス'],      topic: '健康' },
    { keywords: ['教育','学校','大学','生徒'],          topic: '教育' },
  ]
  for (const { keywords, topic } of topicMap) {
    if (keywords.some(k => title.includes(k))) return topic
  }
  return '一般'
}

// ► キャッシュ統計（開發除錯用）
export function getCacheStats() {
  return cache.getStats()
}
