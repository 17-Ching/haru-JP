# 哈魯日文學習平台 — 系統架構文件
> 技術討論小組：資深全端架構師 × 創意互動設計師 × 語言教育產品經理

---

## 一、整體架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Vue 3 SPA)                       │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ GravityLayer│  │  RouterView  │  │  GlobalStore(Pinia)│  │
│  │ (Matter.js) │  │  (vue-router)│  │  user/vocab/notes  │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬───────────┘  │
│         └────────────────┼──────────────────-─┘              │
│                          ▼                                   │
│              ┌───────────────────────┐                       │
│              │   Axios HTTP Client   │                       │
│              │   (interceptor + JWT) │                       │
│              └───────────┬───────────┘                       │
└──────────────────────────┼──────────────────────────────────┘
                           │  REST / JSON
┌──────────────────────────▼──────────────────────────────────┐
│                   SERVER (Node.js + Express)                  │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │ /auth      │  │ /vocab     │  │ /quiz  /notes        │   │
│  │ /articles  │  │ /grammar   │  │ /recommend /mock-exam │   │
│  └────────────┘  └────────────┘  └──────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              Middleware Layer                          │   │
│  │  authMiddleware │ rateLimiter │ jlptLevelGuard        │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │  SQLite /   │   │  Redis Cache │   │  File Storage    │  │
│  │  PostgreSQL │   │  (sessions)  │   │  (audio/images)  │  │
│  └─────────────┘   └──────────────┘   └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、Vue 3 前端組件結構

```
src/
├── main.js
├── App.vue                        # 根組件，掛載 GravityLayer
│
├── layouts/
│   ├── DefaultLayout.vue          # 含側邊導覽、頂部欄
│   └── ExamLayout.vue             # 考試模式（無重力干擾）
│
├── components/
│   ├── gravity/
│   │   ├── GravityLayer.vue       # 全局哈魯粒子畫布（Matter.js world）
│   │   ├── FloatingCard.vue       # 漂浮單字卡（Kana / Kanji）
│   │   ├── FallingKana.vue        # 假名掉落動畫
│   │   └── useGravityEngine.js    # Composable：物理引擎控制
│   │
│   ├── vocab/
│   │   ├── VocabCard.vue          # 單字卡（正/反面翻轉）
│   │   ├── VocabList.vue          # 分級單字列表
│   │   └── VocabSearch.vue        # 搜尋 + 過濾（依 JLPT 級別）
│   │
│   ├── quiz/
│   │   ├── QuizContainer.vue      # 測驗主容器（控制題型切換）
│   │   ├── MultipleChoice.vue     # 四選一題型
│   │   ├── FillBlank.vue          # 填空題型
│   │   └── QuizResult.vue         # 結果與錯題收集
│   │
│   ├── notes/
│   │   ├── NoteEditor.vue         # 筆記編輯器（含 Markdown）
│   │   ├── ReviewQueue.vue        # SRS 複習隊列
│   │   └── NoteCard.vue           # 單條筆記展示
│   │
│   ├── articles/
│   │   ├── ArticleReader.vue      # 文章閱讀器（振假名 + 詞彙連結）
│   │   ├── DailyArticle.vue       # 每日推薦文章
│   │   └── ArticleFilter.vue      # 依級別過濾
│   │
│   └── ui/
│       ├── LevelBadge.vue         # N5~N1 等級徽章
│       ├── ProgressRing.vue       # 學習進度環形圖
│       └── GlassCard.vue          # 玻璃態卡片基礎元件
│
├── views/
│   ├── HomeView.vue               # 儀表板（今日任務 + 進度）
│   ├── VocabView.vue
│   ├── GrammarView.vue
│   ├── QuizView.vue
│   ├── ArticlesView.vue
│   ├── NotesView.vue
│   ├── MockExamView.vue
│   └── ProfileView.vue
│
├── router/
│   └── index.js                   # vue-router 4，lazy-loaded routes
│
├── stores/
│   ├── useUserStore.js            # 使用者資訊、JWT
│   ├── useVocabStore.js           # 單字快取
│   ├── useNoteStore.js            # 筆記 + SRS 資料
│   └── useGravityStore.js         # 物理引擎全局狀態
│
├── composables/
│   ├── useJLPTFilter.js           # 依 N 等級過濾資料
│   ├── useSRS.js                  # 間隔重複記憶演算法
│   ├── useRecommend.js            # 文章推薦邏輯
│   └── useDebounce.js
│
├── assets/
│   ├── styles/
│   │   ├── main.scss              # 全局 Sass 入口
│   │   ├── _variables.scss        # 設計 token
│   │   ├── _gravity.scss          # 重力層樣式
│   │   └── _typography.scss       # 日文字體設定
│   └── fonts/
│       └── NotoSansJP.woff2
│
└── utils/
    ├── api.js                     # Axios 實例 + 攔截器
    ├── jlptLevels.js              # N5~N1 常數定義
    └── srsAlgorithm.js            # SM-2 算法實作
```

---

## 三、Node.js 後端路由規劃

```
server/
├── app.js                         # Express 入口
├── config/
│   ├── db.js                      # DB 連線設定
│   └── redis.js                   # Redis 快取
│
├── routes/
│   ├── auth.routes.js             # POST /auth/login, /auth/register, /auth/refresh
│   ├── vocab.routes.js            # GET  /vocab, /vocab/:id
│   ├── grammar.routes.js          # GET  /grammar, /grammar/:id
│   ├── quiz.routes.js             # GET  /quiz/generate, POST /quiz/submit
│   ├── notes.routes.js            # CRUD /notes, POST /notes/sync
│   ├── articles.routes.js         # GET  /articles/daily, /articles/:id
│   ├── recommend.routes.js        # GET  /recommend/:userId
│   └── exam.routes.js             # GET  /exam/mock, POST /exam/submit
│
├── controllers/
│   ├── auth.controller.js
│   ├── vocab.controller.js
│   ├── quiz.controller.js
│   ├── notes.controller.js
│   ├── recommend.controller.js
│   └── exam.controller.js
│
├── middleware/
│   ├── auth.middleware.js         # JWT 驗證
│   ├── jlptGuard.middleware.js    # 依用戶等級限制內容存取
│   └── rateLimiter.middleware.js
│
├── models/
│   ├── User.js
│   ├── Vocab.js
│   ├── Grammar.js
│   ├── Article.js
│   ├── Note.js
│   └── ExamResult.js
│
└── services/
    ├── srsService.js              # 伺服器端 SRS 排程（可選）
    ├── recommendService.js        # 推薦算法
    └── quizGeneratorService.js    # 動態出題邏輯
```

---

## 四、架構師備忘錄

> **架構師觀點：** 為何不用 TypeScript？  
> 在這個規模的專案，JSDoc + Volar (Vite) 的類型提示已足夠，避免了 TS 編譯成本與 `.d.ts` 地獄。  
> 關鍵：用 **JSDoc `@typedef`** 定義 VocabItem、NoteEntry 等資料結構，讓 IDE 依然有完整補全。

```js
/**
 * @typedef {Object} VocabItem
 * @property {string} id
 * @property {string} kanji
 * @property {string} reading
 * @property {string} meaning
 * @property {'N5'|'N4'|'N3'|'N2'|'N1'} level
 * @property {string[]} exampleSentences
 */
```
