// server/routes/api.js — 主 API 路由 (v1)
// GET  /api/v1/exercises/:type/:level
// POST /api/v1/quiz/submit          ← 提交測驗答案、自動記錄錯題
// POST /api/v1/notes
// GET  /api/v1/notes
// POST /api/v1/notes/review
// GET  /api/v1/articles/daily
// GET  /api/v1/recommend/:userId

import { Router }       from 'express'
import { v4 as uuidv4 } from 'uuid'
import { authMiddleware } from '../middleware/auth.js'
import { getVocabByLevel, vocabData } from '../data/vocab.js'
import { getDailyArticles, articlesData } from '../data/articles.js'
import { cacheQuiz, getQuiz } from '../data/quizCache.js'

const router = Router()

// ── 所有 API 需要驗證（除測試用路由）─────────────────────────
router.use(authMiddleware)

// ════════════════════════════════════════════════════════════
// EXERCISES  GET /api/v1/exercises/:type/:level
// type: vocab | grammar | reading
// ════════════════════════════════════════════════════════════
router.get('/exercises/:type/:level', (req, res) => {
  const { type, level }  = req.params
  const count            = Math.min(parseInt(req.query.count) || 10, 50)
  const validLevels      = ['N5','N4','N3','N2','N1']
  const validTypes       = ['vocab','grammar','reading']

  if (!validLevels.includes(level))
    return res.status(400).json({ error: `無效等級，請使用 ${validLevels.join('/')}` })
  if (!validTypes.includes(type))
    return res.status(400).json({ error: `無效類型，請使用 ${validTypes.join('/')}` })

  let items = []

  if (type === 'vocab') {
    items = getVocabByLevel(level, count).map(v => buildVocabQuestion(v))
  }

  if (type === 'grammar') {
    items = buildGrammarQuestions(level, count)
  }

  if (type === 'reading') {
    const article = articlesData.filter(a => a.level === level).at(0)
    if (!article) return res.status(404).json({ error: '此等級暫無閱讀文章' })
    items = buildReadingQuestions(article)
  }

  const quizId    = uuidv4()
  const expiresAt = Date.now() + 30 * 60 * 1000

  // 存入 cache 供後續 /quiz/submit 驗證
  cacheQuiz(quizId, items, req.user.id)

  res.json({
    quizId,
    type,
    level,
    questions: items,
    expiresAt: new Date(expiresAt).toISOString()
  })
})

// ════════════════════════════════════════════════════════════
// QUIZ SUBMIT  POST /api/v1/quiz/submit
// 伺服器端驗證答案，自動將錯題存入筆記（SRS）
// ════════════════════════════════════════════════════════════

/**
 * 暫存最近產生的 quizId → questions 映射（30 分鐘 TTL，見 data/quizCache.js）
 */

// 攔截 GET /exercises 回應，將題組存入 cache
// 用 middleware 形式包裝原本的 exercises 路由
router.post('/quiz/submit', (req, res) => {
  const userId  = req.user.id
  const { quizId, answers = [], timeTaken } = req.body

  if (!quizId || !Array.isArray(answers))
    return res.status(400).json({ error: 'quizId 與 answers 為必填' })

  // 從 cache 取回題目（含正確答案）
  const cached = getQuiz(quizId)
  if (!cached) return res.status(404).json({ error: '測驗已過期或不存在，請重新開始測驗（伺服器重啟後快取清空屬正常現象）' })

  const { questions } = cached
  let correct = 0
  const wrongItems = []

  // 逐題驗證
  for (const { questionId, answer } of answers) {
    const q = questions.find(q => q.id === questionId)
    if (!q) continue
    if (answer === q.answer) {
      correct++
    } else {
      wrongItems.push({ questionId, yourAnswer: answer, correctAnswer: q.answer, prompt: q.prompt, level: q.level })
    }
  }

  // 自動將錯題存入筆記（SRS），讓錯題明天出現在複習隊列
  const userNotes = notesStore.get(userId) || []
  for (const w of wrongItems) {
    // 避免重複：同一題 id 的筆記若已存在，跳過新增（只更新 SRS 為重置）
    const existing = userNotes.find(n => n.contentId === w.questionId)
    if (existing) {
      // 答錯，SRS 重置（等同 quality=0）
      existing.srsData = applySM2(existing.srsData, 0)
      existing.updatedAt = new Date().toISOString()
    } else {
      userNotes.push({
        id:          uuidv4(),
        userId,
        contentType: 'vocab',
        contentId:   w.questionId,
        text:        `❌ 答錯：${w.prompt}\n正確答案：${w.correctAnswer}`,
        tags:        [w.level, '錯題'],
        srsData: {
          interval:    1,
          repetitions: 0,
          easeFactor:  2.5,
          nextReview:  new Date().toISOString()  // 今天就要複習
        },
        createdAt:  new Date().toISOString(),
        updatedAt:  new Date().toISOString()
      })
    }
  }
  notesStore.set(userId, userNotes)

  // 清理已使用的 cache（一次性測驗）
  // quizCache 的清理交由 quizCache.js 的 TTL setTimeout 處理

  res.json({
    quizId,
    score:      correct,
    total:      questions.length,
    correct,
    timeTaken:  timeTaken || null,
    wrongItems,
    autoSavedToNotes: wrongItems.length
  })
})

// ════════════════════════════════════════════════════════════
// NOTES  GET /api/v1/notes
// ════════════════════════════════════════════════════════════
/** @type {Map<string, import('../data/notes.js').NoteEntry[]>} */
const notesStore = new Map()

router.get('/notes', (req, res) => {
  const userId   = req.user.id
  const dueOnly  = req.query.dueForReview === 'true'
  const userNotes = notesStore.get(userId) || []
  const today    = new Date().toDateString()

  const filtered = dueOnly
    ? userNotes.filter(n => new Date(n.srsData.nextReview).toDateString() <= today)
    : userNotes

  res.json({ items: filtered, total: filtered.length })
})

// ════════════════════════════════════════════════════════════
// NOTES  POST /api/v1/notes
// ════════════════════════════════════════════════════════════
router.post('/notes', (req, res) => {
  const userId = req.user.id
  const { contentType, contentId, text, tags = [] } = req.body

  if (!contentType || !text)
    return res.status(400).json({ error: 'contentType 與 text 為必填' })

  /** @type {import('../data/notes.js').NoteEntry} */
  const note = {
    id:          uuidv4(),
    userId,
    contentType,
    contentId:   contentId || null,
    text,
    tags,
    srsData: {
      interval:    1,
      repetitions: 0,
      easeFactor:  2.5,
      nextReview:  new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const userNotes = notesStore.get(userId) || []
  userNotes.push(note)
  notesStore.set(userId, userNotes)

  res.status(201).json(note)
})

// ════════════════════════════════════════════════════════════
// NOTES REVIEW  POST /api/v1/notes/review
// ════════════════════════════════════════════════════════════
router.post('/notes/review', (req, res) => {
  const userId   = req.user.id
  const { noteId, quality } = req.body

  if (quality === undefined || quality < 0 || quality > 5)
    return res.status(400).json({ error: 'quality 必須為 0~5 整數' })

  const userNotes = notesStore.get(userId) || []
  const note      = userNotes.find(n => n.id === noteId)
  if (!note) return res.status(404).json({ error: '找不到此筆記' })

  // SM-2 算法
  const updated = applySM2(note.srsData, parseInt(quality))
  note.srsData  = updated
  note.updatedAt = new Date().toISOString()

  res.json({ noteId, ...updated })
})

// ════════════════════════════════════════════════════════════
// ARTICLES  GET /api/v1/articles/daily
// ════════════════════════════════════════════════════════════
router.get('/articles/daily', (req, res) => {
  const userLevel = req.user.level || 'N5'
  // 生產環境：從 reading_history 查詢 recentReadIds
  const articles  = getDailyArticles(userLevel, [])
  res.json({ articles })
})

// ════════════════════════════════════════════════════════════
// ARTICLES  GET /api/v1/articles
// ════════════════════════════════════════════════════════════
router.get('/articles', (req, res) => {
  const { level, topic } = req.query
  let list = [...articlesData]
  if (level) list = list.filter(a => a.level === level)
  if (topic) list = list.filter(a => a.topic === topic)
  res.json({ items: list, total: list.length })
})

// ════════════════════════════════════════════════════════════
// RECOMMEND  GET /api/v1/recommend/:userId
// ════════════════════════════════════════════════════════════
router.get('/recommend/:userId', (req, res) => {
  const userLevel  = req.user.level || 'N5'
  const userNotes  = notesStore.get(req.user.id) || []
  const reviewDue  = userNotes.filter(n => {
    return new Date(n.srsData.nextReview) <= new Date()
  }).length

  const vocabs   = getVocabByLevel(userLevel, 10)
  const articles = getDailyArticles(userLevel, [])

  res.json({ vocabs, articles, reviewDue })
})

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

/**
 * 從 VocabItem 建立四選一測驗題
 * @param {import('../data/vocab.js').VocabItem} vocab
 */
function buildVocabQuestion(vocab) {
  // 干擾選項：從同等級其他單字隨機選 3 個
  const distractors = vocabData
    .filter(v => v.id !== vocab.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(v => v.meaning)

  const options = shuffle([vocab.meaning, ...distractors])
  return {
    id:       vocab.id,
    type:     'multiple_choice',
    prompt:   `「${vocab.kanji}」（${vocab.reading}）的意思是？`,
    options,
    answer:   vocab.meaning,  // 伺服器端保留答案（提交時驗證）
    level:    vocab.level
  }
}

/** 文法题（示例結構） */
function buildGrammarQuestions(level, count) {
  const grammarSeed = [
    { id:'g001', level:'N5', pattern:'〜は〜です', prompt:'「私___学生です。」填入適當助詞', answer:'は', options:['は','が','を','に'] },
    { id:'g002', level:'N4', pattern:'〜てみる',    prompt:'「一度やっ___ください。」填入適當形式', answer:'てみて', options:['てみて','てから','ながら','ために'] },
    { id:'g003', level:'N3', pattern:'〜ようになる', prompt:'日本語が話せる___なった。', answer:'ように', options:['ように','ことに','ためだ','らしく'] },
    { id:'g004', level:'N2', pattern:'〜に反して',   prompt:'期待___、試験は難しかった。', answer:'に反して', options:['に反して','に対して','にとって','について'] },
    { id:'g005', level:'N1', pattern:'〜ならでは',   prompt:'日本___の文化だ。', answer:'ならでは', options:['ならでは','だけでは','ほどでは','くらいでは'] },
  ]
  return grammarSeed.filter(g => g.level === level).slice(0, count).map(g => ({
    id: g.id, type: 'fill_blank', prompt: g.prompt, options: g.options, answer: g.answer, level: g.level
  }))
}

/** 閱讀理解題 */
function buildReadingQuestions(article) {
  return [{
    id:       `r-${article.id}`,
    type:     'reading_comp',
    prompt:   '根據文章，以下描述哪項正確？',
    article:  { id: article.id, title: article.title, content: article.content },
    options:  ['文章提到了科學', '文章是關於食物的', '文章描述了購物', '文章介紹了音樂'],
    answer:   '文章提到了科學',
    level:    article.level
  }]
}

/**
 * SM-2 間隔重複算法
 * @param {{interval:number, repetitions:number, easeFactor:number}} srsData
 * @param {number} quality - 0~5
 */
function applySM2(srsData, quality) {
  let { interval, repetitions, easeFactor } = srsData

  if (quality < 3) {
    repetitions = 0
    interval    = 1
  } else {
    if      (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else                        interval = Math.round(interval * easeFactor)
    repetitions += 1
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  return { interval, repetitions, easeFactor: +easeFactor.toFixed(2), nextReview: nextReview.toISOString() }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default router
