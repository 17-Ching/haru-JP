# 學習邏輯與資料庫建模設計文件
> 語言教育產品經理（JLPT 專家）主導 × 全端架構師協作

---

## 一、N5-N1 內容分級邏輯

### JLPT 等級對應表

| 等級 | 單字量  | 漢字量 | 文法數 | 文章難度 | 每日目標（字/分） |
|------|---------|--------|--------|----------|-----------------|
| N5   | ~800    | ~100   | ~100   | 極簡短文  | 50字/分          |
| N4   | ~1,500  | ~300   | ~170   | 短文/對話 | 80字/分          |
| N3   | ~3,700  | ~650   | ~200   | 日常文章  | 100字/分         |
| N2   | ~6,000  | ~1,000 | ~300   | 新聞/論說 | 150字/分         |
| N1   | ~10,000 | ~2,000 | ~500   | 學術/文學 | 200字/分         |

### JSON Schema：VocabItem（詳細版）
```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "type": "object",
  "required": ["id", "kanji", "reading", "meaning", "level"],
  "properties": {
    "id":       { "type": "string" },
    "kanji":    { "type": "string" },
    "reading":  { "type": "string" },
    "meaning":  { "type": "string" },
    "level":    { "type": "string", "enum": ["N5","N4","N3","N2","N1"] },
    "pos":      { "type": "string", "enum": ["noun","verb","adj","adv","particle","expression"] },
    "jlptFreq": { "type": "integer", "description": "頻率排名，越小越常考" },
    "tags":     { "type": "array", "items": { "type": "string" } },
    "examples": {
      "type": "array",
      "maxItems": 3,
      "items": {
        "type": "object",
        "properties": {
          "sentence":    { "type": "string" },
          "furigana":    { "type": "string" },
          "translation": { "type": "string" }
        }
      }
    },
    "audioUrl":  { "type": "string", "format": "uri" },
    "imageUrl":  { "type": "string", "format": "uri", "nullable": true }
  }
}
```

### JSON Schema：GrammarPoint（詳細版）
```json
{
  "type": "object",
  "required": ["id", "pattern", "level", "explanation"],
  "properties": {
    "id":          { "type": "string" },
    "pattern":     { "type": "string", "example": "〜てみる" },
    "meaning":     { "type": "string" },
    "level":       { "type": "string", "enum": ["N5","N4","N3","N2","N1"] },
    "explanation": { "type": "string" },
    "formation": {
      "type": "array",
      "description": "接續方式",
      "items": {
        "type": "object",
        "properties": {
          "type":    { "type": "string", "example": "動詞て形" },
          "example": { "type": "string", "example": "食べてみる" }
        }
      }
    },
    "examples": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sentence":    { "type": "string" },
          "translation": { "type": "string" },
          "difficulty":  { "type": "string", "enum": ["easy","medium","hard"] }
        }
      }
    },
    "similarPatterns": { "type": "array", "items": { "type": "string" } },
    "commonMistakes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "wrong":       { "type": "string" },
          "correct":     { "type": "string" },
          "explanation": { "type": "string" }
        }
      }
    }
  }
}
```

---

## 二、每日推薦文章演算法

```
推薦邏輯流程圖
═══════════════════════════════════════════

  使用者登入
       │
       ▼
  讀取推薦輸入參數
  ┌──────────────────────────────────┐
  │ • 用戶當前 JLPT 等級             │
  │ • 本週做錯的詞彙主題標籤          │
  │ • 最近讀過的文章（排除重複）      │
  │ • 歷史閱讀偏好主題（行為加權）    │
  │ • 當前學習連勝天數（難度係數）    │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │         候選文章池過濾            │
  │                                  │
  │  1. 等級過濾：                   │
  │     level == userLevel           │
  │     OR level == userLevel - 1    │
  │     （10% 機率推薦難一級）        │
  │                                  │
  │  2. 排除最近 7 天已讀             │
  │                                  │
  │  3. 根據錯題標籤加分（+20%）      │
  │     e.g. 錯了很多「交通」詞彙     │
  │     → 推薦交通主題文章            │
  └──────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────┐
  │       評分排序（Score Function）  │
  │                                  │
  │  score = (                       │
  │    topicMatchScore * 0.40 +      │
  │    vocabErrorMatchScore * 0.35 + │
  │    noveltyScore * 0.15 +         │
  │    freshnessScore * 0.10         │
  │  )                               │
  └──────────────────────────────────┘
       │
       ▼
  回傳 Top 3 文章
```

### Node.js 服務實作概念
```js
// services/recommendService.js
async function getDailyArticles(userId) {
  const user         = await User.findById(userId)
  const erroredTags  = await getNoteErrorTags(userId, { days: 7 })
  const recentRead   = await getRecentArticleIds(userId, { days: 7 })

  // 候選池：符合等級，排除已讀
  const candidates = await Article.findAll({
    where: {
      level: [user.level, lowerLevel(user.level)],
      id:    { $notIn: recentRead }
    }
  })

  // 評分
  const scored = candidates.map(article => {
    const topicMatch   = calcTopicMatchScore(article.tags, user.preferredTopics)
    const vocabMatch   = calcVocabMatchScore(article.vocabLinks, erroredTags)
    const novelty      = 1 - (article.readCount / maxReadCount)
    const freshness    = calcFreshnessScore(article.publishedAt)

    return {
      ...article,
      score: topicMatch * 0.40 + vocabMatch * 0.35 + novelty * 0.15 + freshness * 0.10
    }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
```

---

## 三、間隔重複記憶（SRS）複習演算法 — SM-2

SM-2 算法是 Anki 使用的核心算法，已被語言學習領域驗證有效。

### 算法流程
```
使用者看到單字/筆記
         │
         ▼
  回答品質評分（0-5）
  ┌───────────────────────┐
  │ 0: 完全忘記            │
  │ 1: 嚴重錯誤            │
  │ 2: 勉強記得（仍錯）    │
  │ 3: 記得（有些猶豫）    │
  │ 4: 記得（稍有困難）    │
  │ 5: 完美記得            │
  └───────────────────────┘
         │
         ▼
  ┌───────────────────────────────────────┐
  │           SM-2 計算                   │
  │                                       │
  │  if quality < 3:                      │
  │    → 重置：interval = 1, rep = 0      │
  │    → 明天再複習                        │
  │                                       │
  │  if quality >= 3:                     │
  │    rep == 0 → interval = 1            │
  │    rep == 1 → interval = 6            │
  │    rep > 1  → interval = prev * EF    │
  │                                       │
  │  EF（難度係數）更新：                  │
  │  EF' = EF + (0.1 - (5-q)(0.08+(5-q)  │
  │         * 0.02))                      │
  │  EF' = max(EF', 1.3)                  │
  └───────────────────────────────────────┘
         │
         ▼
  設定 nextReview = today + interval (days)
  存入 NoteEntry.srsData
```

### JS 實作
```js
// utils/srsAlgorithm.js

/**
 * SM-2 間隔重複計算
 * @param {Object} srsData - 當前 SRS 狀態
 * @param {number} quality - 0~5 評分
 * @returns {Object} 更新後的 SRS 狀態
 */
export function calcSM2(srsData, quality) {
  let { interval, repetitions, easeFactor } = srsData

  if (quality < 3) {
    // 忘記：重置
    repetitions = 0
    interval    = 1
  } else {
    if      (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else                        interval = Math.round(interval * easeFactor)

    repetitions += 1
  }

  // 更新難度係數（EF）
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  easeFactor = Math.max(easeFactor, 1.3)

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  return { interval, repetitions, easeFactor, nextReview: nextReview.toISOString() }
}
```

### 每日學習目標（產品邏輯）
```
每日推薦複習量：
  新單字：   10-20個（依等級）
  複習單字： 由 SRS 自動排程，通常 30-50個
  新文章：   1-2篇
  文法複習： 2-3個文法點
  
連勝獎勵機制：
  7天連勝  → 解鎖「N+1 預覽」單字
  30天連勝 → 解鎖隱藏主題包（動漫/文學）
```

---

## 四、資料庫模型（SQL Schema）

```sql
-- 使用者
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(50) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  level       VARCHAR(2) DEFAULT 'N5' CHECK (level IN ('N5','N4','N3','N2','N1')),
  streak      INTEGER DEFAULT 0,
  last_active DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 單字
CREATE TABLE vocab (
  id          VARCHAR(20) PRIMARY KEY,
  kanji       VARCHAR(50) NOT NULL,
  reading     VARCHAR(50) NOT NULL,
  meaning     TEXT NOT NULL,
  level       VARCHAR(2) CHECK (level IN ('N5','N4','N3','N2','N1')),
  pos         VARCHAR(20),
  jlpt_freq   INTEGER,
  audio_url   VARCHAR(500),
  examples    JSONB,          -- 例句陣列
  tags        TEXT[]
);

-- 筆記（含 SRS 資料）
CREATE TABLE notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  content_type   VARCHAR(10) CHECK (content_type IN ('vocab','grammar','custom')),
  content_id     VARCHAR(20),  -- FK 至 vocab 或 grammar（彈性關聯）
  text           TEXT NOT NULL,
  tags           TEXT[],
  -- SM-2 SRS 欄位
  srs_interval   INTEGER DEFAULT 1,
  srs_reps       INTEGER DEFAULT 0,
  srs_ease       FLOAT DEFAULT 2.5,
  next_review    DATE DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notes_review ON notes(user_id, next_review);

-- 文章
CREATE TABLE articles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(200) NOT NULL,
  content_html TEXT NOT NULL,
  level        VARCHAR(2),
  topic        VARCHAR(50),
  word_count   INTEGER,
  vocab_links  JSONB,           -- [{word, vocabId}]
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 閱讀記錄
CREATE TABLE reading_history (
  user_id    UUID REFERENCES users(id),
  article_id UUID REFERENCES articles(id),
  read_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, article_id)
);

-- 模擬考結果
CREATE TABLE exam_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  level        VARCHAR(2),
  total_score  FLOAT,
  passed       BOOLEAN,
  section_data JSONB,           -- 各節分數詳情
  taken_at     TIMESTAMPTZ DEFAULT NOW()
);
```
