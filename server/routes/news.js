// server/routes/news.js — NHK News Web Easy Proxy 路由
// GET /api/v1/news          ?level=&limit=
// GET /api/v1/news/daily    (每日推薦：根據 user level)
// GET /api/v1/news/:id      (單篇文章詳情，抓取全文 HTML)

import { Router } from 'express'
import fetch       from 'node-fetch'
import { authMiddleware } from '../middleware/auth.js'
import { fetchNhkArticles, inferJlptLevel } from '../services/ExternalApiService.js'

const router = Router()
router.use(authMiddleware)

// ════════════════════════════════════════════════════════════
// GET /api/v1/news?level=N4&limit=5
// ════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  const level = req.query.level || null
  const limit = Math.min(parseInt(req.query.limit) || 10, 30)

  try {
    const cleanedArticles = await fetchNhkArticles(level, limit)
    res.json({
      total:   cleanedArticles.length,
      level:   level || 'all',
      items:   cleanedArticles,
      source:  'nhk-easy',
    })
  } catch (err) {
    console.error('[news] NHK fetch error:', err.message)
    res.status(503).json({
      error:    'NHK News API 暫時無法使用',
      detail:   err.message,
      fallback: true  // 前端可切換為本地種子文章
    })
  }
})

// ════════════════════════════════════════════════════════════
// GET /api/v1/news/daily
// 根據登入使用者的等級推薦今日文章
// ════════════════════════════════════════════════════════════
router.get('/daily', async (req, res) => {
  const userLevel = req.user?.level || 'N5'
  try {
    // 同等級優先 + 上一等級補充
    const levelOrder   = { N5:0, N4:1, N3:2, N2:3, N1:4 }
    const lowerLevel   = Object.keys(levelOrder).find(
      k => levelOrder[k] === Math.max(0, levelOrder[userLevel] - 1)
    )

    const [primary, secondary] = await Promise.all([
      fetchNhkArticles(userLevel, 4).catch(() => []),
      fetchNhkArticles(lowerLevel, 2).catch(() => []),
    ])

    // 去重複
    const ids = new Set(primary.map(a => a.id))
    const combined = [
      ...primary,
      ...secondary.filter(a => !ids.has(a.id))
    ].slice(0, 5)

    res.json({ articles: combined, userLevel, source: 'nhk-easy' })
  } catch (err) {
    console.error('[news/daily] error:', err.message)
    res.status(503).json({ error: '每日文章載入失敗', fallback: true })
  }
})

// ════════════════════════════════════════════════════════════
// GET /api/v1/news/:newsId
// 取得 NHK Easy 單篇文章全文（HTML + 振假名）
// ════════════════════════════════════════════════════════════
router.get('/:newsId', async (req, res) => {
  const { newsId } = req.params

  // 安全性：只允許純數字的 newsId（NHK ID 格式）
  if (!/^\d+$/.test(newsId))
    return res.status(400).json({ error: '無效的文章 ID 格式' })

  try {
    const articleUrl = `https://www3.nhk.or.jp/news/easy/${newsId}/${newsId}.html`
    const rawHtml    = await fetch(articleUrl, {
      headers: { 'Accept-Language': 'ja', 'User-Agent': 'HaruJP-Learner/1.0' }
    }).then(r => {
      if (!r.ok) throw new Error(`NHK returned ${r.status}`)
      return r.text()
    })

    // 從 HTML 擷取文章內文（<article> 或 .article-body）
    // 使用基礎正則取出，避免引入 cheerio 重型依賴
    const contentMatch = rawHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    const rawContent   = contentMatch?.[1] || ''

    // 清洗：移除 script/style，保留振假名 <ruby> 標籤
    const cleanedContent = rawContent
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<(?!\/?(ruby|rt|rb|p|span|br|strong|em)\b)[^>]+>/gi, '')
      .trim()

    // 自動推斷等級（從清洗後的純文字分析）
    const plainText = cleanedContent.replace(/<[^>]+>/g, '')
    const level     = inferJlptLevel(plainText.slice(0, 300))

    res.json({
      newsId,
      level,
      content: cleanedContent,  // 含振假名的 HTML（已清洗）
      url:     articleUrl,
      source:  'nhk-easy'
    })
  } catch (err) {
    console.error(`[news/${newsId}] error:`, err.message)
    res.status(503).json({ error: '文章載入失敗', detail: err.message })
  }
})

export default router
