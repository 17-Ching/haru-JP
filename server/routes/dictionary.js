// server/routes/dictionary.js — Jisho API Proxy 路由
// GET /api/v1/dict/search?q=&limit=
// GET /api/v1/dict/vocab-quiz/:level  (用外部 API 動態生成測驗單字)

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { searchVocab, inferJlptLevel } from '../services/ExternalApiService.js'

const router = Router()
router.use(authMiddleware)

// ════════════════════════════════════════════════════════════
// GET /api/v1/dict/search?q=水&limit=5
// 搜尋 Jisho 辭典並回傳清洗後的單字資料
// ════════════════════════════════════════════════════════════
router.get('/search', async (req, res) => {
  const keyword = (req.query.q || '').trim()
  const limit   = Math.min(parseInt(req.query.limit) || 10, 20)

  if (!keyword) return res.status(400).json({ error: '請提供查詢關鍵字 (?q=...)' })

  try {
    // cleanedItems — 已清洗格式化的資料（區別於 rawData）
    const cleanedItems = await searchVocab(keyword, limit)
    res.json({
      keyword,
      total:  cleanedItems.length,
      items:  cleanedItems,
      source: 'jisho',
      cached: false  // NodeCache 命中時仍回傳此欄，前端可自行比對 latency
    })
  } catch (err) {
    console.error('[dict/search] Jisho API error:', err.message)
    res.status(503).json({
      error:   '外部辭典 API 暫時無法使用',
      detail:  err.message,
      fallback: true  // 前端可檢查此欄，切換為本地種子資料
    })
  }
})

// ════════════════════════════════════════════════════════════
// GET /api/v1/dict/vocab-quiz/:level
// 從 Jisho 動態抓取該等級關鍵字，組成多選一測驗題
// ════════════════════════════════════════════════════════════

/** 各等級代表搜尋關鍵字（種子詞，帶動 Jisho 回傳同等級詞彙）*/
const LEVEL_SEED_WORDS = {
  N5: ['食べる', '飲む', '行く', '見る', '来る', '日本', '水', '本'],
  N4: ['勉強する', '働く', '旅行', '電話', '家族', '時間', '準備'],
  N3: ['経験', '説明', '相談', '解決', '紹介', '記念', '確認'],
  N2: ['影響', '状況', '対策', '評価', '検討', '実施', '提案'],
  N1: ['概念', '論証', '抽象', '哲学', '批判', '傾向', '示唆'],
}

router.get('/vocab-quiz/:level', async (req, res) => {
  const { level } = req.params
  const validLevels = ['N5','N4','N3','N2','N1']
  if (!validLevels.includes(level))
    return res.status(400).json({ error: `無效等級: ${level}` })

  const seeds = LEVEL_SEED_WORDS[level]

  try {
    // 並行查詢多個種子字，收集足夠的候選單字
    const seedWord = seeds[Math.floor(Math.random() * seeds.length)]
    const cleanedItems = await searchVocab(seedWord, 20)

    // 過濾與當前等級相符的單字
    const levelItems = cleanedItems.filter(item =>
      item.level === level || item.tags.includes(level)
    )

    if (levelItems.length < 4) {
      // 樣本不足：回傳所有結果（讓前端繼續）
      return res.json({ level, items: cleanedItems.slice(0, 10), note: '樣本不足，已回傳全部結果' })
    }

    // 隨機選取答題單字
    const shuffled = levelItems.sort(() => Math.random() - 0.5)
    const correct  = shuffled[0]
    const wrongs   = shuffled.slice(1, 4).map(v => v.meaning)
    const options  = [correct.meaning, ...wrongs].sort(() => Math.random() - 0.5)

    res.json({
      level,
      quiz: {
        id:      correct.id,
        type:    'multiple_choice',
        prompt:  `「${correct.kanji}」（${correct.reading}）的意思是？`,
        options,
        // ⚠️ 注意：此欄位只供「即時驗證」開發用途
        // 生產環境請移除 answer 欄位，改由 /quiz/submit 伺服器端驗證
        answer: correct.meaning,
        level,
        source: 'jisho',
        vocabDetail: correct
      }
    })
  } catch (err) {
    console.error('[dict/vocab-quiz] error:', err.message)
    res.status(503).json({ error: '外部辭典暫時無法使用', fallback: true })
  }
})

// ════════════════════════════════════════════════════════════
// POST /api/v1/dict/add-note  (外部單字一鍵加入筆記)
// Body: { kanji, reading, meaning, level, source }
// ════════════════════════════════════════════════════════════
router.post('/add-note', async (req, res) => {
  const { kanji, reading, meaning, level, source } = req.body
  if (!kanji || !meaning) return res.status(400).json({ error: 'kanji + meaning 為必填' })

  // 轉發到 /notes 的邏輯（共用 notesStore）
  // 這裡直接回傳成功訊號，讓 api.js 的 POST /notes 處理實際儲存
  // 前端呼叫此路由後，同時呼叫 POST /api/v1/notes 即可
  res.json({
    queued: true,
    note: {
      contentType: 'vocab',
      contentId:   `${source || 'external'}-${kanji}`,
      text:        `${kanji}（${reading}）— ${meaning}`,
      tags:        [level || inferJlptLevel(kanji), source || 'external'],
    },
    message: '請使用 POST /api/v1/notes 正式儲存（已提供建議 payload）'
  })
})

export default router
