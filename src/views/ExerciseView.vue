<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <!-- 標題 / 模式切換 -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <h1 class="text-2xl font-bold text-white mr-auto">練習模式</h1>

      <!-- 類型選擇 -->
      <div class="flex rounded-xl overflow-hidden border border-white/10">
        <button v-for="t in TYPES" :key="t.value"
                @click="switchMode(t.value)"
                :class="['px-4 py-2 text-sm font-medium transition-colors',
                          exerciseType===t.value ? 'bg-primary-500/25 text-primary-400' : 'text-gray-400 hover:text-white']">
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <!-- 等級選擇 -->
      <div class="flex gap-1">
        <button v-for="l in LEVELS" :key="l"
                @click="switchLevel(l)"
                :class="[`level-badge level-badge--${l} cursor-pointer transition-opacity`,
                          level===l ? 'opacity-100' : 'opacity-40 hover:opacity-70']">
          {{ l }}
        </button>
      </div>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="flex flex-col items-center py-20 text-gray-400">
      <span class="text-4xl animate-float-slow mb-3">⏳</span>
      <p>載入題目中...</p>
    </div>

    <!-- 完成畫面 -->
    <div v-else-if="isFinished" class="glass-card p-8 text-center fade-in-up">
      <div class="text-5xl mb-4">{{ score === total ? '🎉' : '📊' }}</div>
      <h2 class="text-2xl font-bold text-white mb-1">測驗完成！</h2>
      <p class="text-gray-400 mb-2">得分：<span class="text-primary-400 font-bold text-xl">{{ score }} / {{ total }}</span></p>
      <!-- 錯題自動存入筆記提示 -->
      <p v-if="submitResult?.autoSavedToNotes > 0"
         class="text-sm text-accent-400 mb-4">
        📝 {{ submitResult.autoSavedToNotes }} 題答錯已自動加入筆記複習
      </p>
      <p v-if="submitError" class="text-xs text-red-400 mb-4">{{ submitError }}</p>
      <div class="flex justify-center gap-3">
        <button @click="restart" class="btn-primary">再做一次</button>
        <button @click="$router.push('/notes')" class="btn-ghost">查看筆記</button>
      </div>
    </div>

    <!-- 題目卡片 -->
    <div v-else-if="currentQ" class="fade-in-up" :key="currentQ.id">
      <!-- 進度條 -->
      <div class="flex items-center gap-3 mb-5">
        <div class="flex-1 bg-space-700 rounded-full h-1.5">
          <div class="h-full bg-primary-500 rounded-full transition-all duration-500"
               :style="`width:${(currentIndex/total)*100}%`" />
        </div>
        <span class="text-xs text-gray-500 shrink-0">{{ currentIndex + 1 }} / {{ total }}</span>
      </div>

      <!-- 等級徽章 -->
      <div class="mb-4">
        <span :class="`level-badge level-badge--${currentQ.level}`">{{ currentQ.level }}</span>
        <span class="ml-2 text-xs text-gray-600 uppercase tracking-wide">{{ exerciseType }}</span>
      </div>

      <!-- 問題 -->
      <div class="glass-card p-6 mb-4">
        <!-- 閱讀文章 -->
        <div v-if="currentQ.type === 'reading_comp' && currentQ.article" class="mb-4 border-l-2 border-primary-500/40 pl-4">
          <h3 class="text-sm text-gray-400 mb-2">📖 閱讀文章</h3>
          <div class="text-sm text-gray-200 leading-relaxed font-jp"
               v-html="currentQ.article.content" />
        </div>
        <p class="text-white text-lg leading-relaxed font-jp">{{ currentQ.prompt }}</p>
      </div>

      <!-- 選項 -->
      <div class="flex flex-col gap-2">
        <button v-for="(opt, i) in currentQ.options" :key="i"
                :class="['option-btn', getOptionClass(opt)]"
                :disabled="answered"
                @click="selectAnswer(opt)">
          <span class="text-gray-500 mr-2">{{ String.fromCharCode(65+i) }}.</span>
          {{ opt }}
        </button>
      </div>

      <!-- 答案反饋 -->
      <Transition name="fade">
        <div v-if="answered" class="mt-4 glass-card p-4 flex items-center justify-between">
          <p :class="selectedAnswer === currentQ.answer ? 'text-green-400' : 'text-red-400'"
             class="font-medium text-sm">
            {{ selectedAnswer === currentQ.answer ? '✅ 正確！' : `❌ 正確答案：${currentQ.answer}` }}
          </p>
          <button @click="nextQuestion" class="btn-primary text-xs px-4 py-2">
            {{ currentIndex + 1 >= total ? '查看結果' : '下一題 →' }}
          </button>
        </div>
      </Transition>
    </div>

    <!-- 無題目 -->
    <div v-else class="glass-card p-8 text-center text-gray-400">
      <p class="text-4xl mb-3">📭</p>
      <p>此等級暫無 {{ TYPES.find(t=>t.value===exerciseType)?.label }} 題目</p>
    </div>

    <!-- 辞典查詢模式（Jisho API 動態搜尋）-->
    <div v-if="exerciseType === 'dict'" class="fade-in-up">
      <!-- 搜尋框 -->
      <div class="flex gap-2 mb-6">
        <input v-model="dictQuery"
               @keyup.enter="searchDict"
               type="text" placeholder="輸入和字或英文... e.g. 食べる"
               class="flex-1 bg-space-700 border border-white/10 rounded-xl px-4 py-2.5 text-sm
                      text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/40
                      focus:ring-1 focus:ring-primary-500/20 transition-colors" />
        <button @click="searchDict" :disabled="dictLoading"
                class="btn-primary px-5">
          {{ dictLoading ? '搜尋中...' : '🔍 搜尋' }}
        </button>
      </div>

      <!-- 外部 API 錯誤提示 -->
      <div v-if="dictError"
           class="mb-4 glass-card px-4 py-3 border-red-500/20 !border flex items-center gap-2">
        <span class="text-red-400 text-sm">⚠️ {{ dictError }}</span>
        <span class="text-xs text-gray-500">已自動切換本地資料</span>
      </div>

      <!-- 搜尋結果 -->
      <div v-if="dictResults.length" class="flex flex-col gap-3">
        <div v-for="item in dictResults" :key="item.id"
             class="glass-card p-4 flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xl font-bold text-white font-jp">{{ item.kanji }}</span>
              <span class="text-sm text-gray-400 font-jp">{{ item.reading }}</span>
              <span :class="`level-badge level-badge--${item.level} !text-[10px]`">{{ item.level }}</span>
            </div>
            <p class="text-sm text-gray-300">{{ item.meaning }}</p>
            <div v-if="item.meanings.length > 1" class="mt-1 flex flex-wrap gap-1">
              <span v-for="(m, i) in item.meanings.slice(1, 4)" :key="i"
                    class="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                {{ m }}
              </span>
            </div>
          </div>
          <button @click="addDictWordToNotes(item)"
                  :disabled="notedItems.has(item.id)"
                  :class="['shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all',
                            notedItems.has(item.id)
                              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                              : 'btn-ghost']">
            {{ notedItems.has(item.id) ? '✅ 已存入' : '📝 加入筆記' }}
          </button>
        </div>
      </div>

      <p v-else-if="!dictLoading && dictQueried" class="text-center text-gray-500 py-8">
        未找到符合的單字，請嘗試其他關鍵字
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore.js'
import api from '@/utils/api.js'

const route     = useRoute()
const router    = useRouter()
const userStore = useUserStore()

const LEVELS = ['N5','N4','N3','N2','N1']
const TYPES  = [
  { value: 'vocab',   label: '單字', icon: '🃦' },
  { value: 'grammar', label: '文法', icon: '📐' },
  { value: 'reading', label: '閱讀', icon: '📖' },
  { value: 'dict',    label: '辞典', icon: '🌐' },  // ← Jisho 外部 API
]

// 狀態
const exerciseType   = ref(route.params.type  || 'vocab')
const level          = ref(route.params.level || userStore.userLevel)
const questions      = ref([])
const quizId         = ref('')
const currentIndex   = ref(0)
const selectedAnswer = ref(null)
const answered       = ref(false)
const score          = ref(0)
const loading        = ref(false)
const answers        = ref([])
const startTime      = ref(0)
const submitResult   = ref(null)
const submitError    = ref('')

// 辞典模式狀態
const dictQuery   = ref('')
const dictResults = ref([])  // cleanedItems 來自 Jisho
const dictLoading = ref(false)
const dictError   = ref('')
const dictQueried = ref(false)
const notedItems  = ref(new Set())  // 已加入筆記的 item.id Set

const total      = computed(() => questions.value.length)
const currentQ   = computed(() => questions.value[currentIndex.value] || null)
const isFinished = computed(() => !loading.value && currentIndex.value >= total.value && total.value > 0)

/** 載入題目 */
async function loadQuestions() {
  loading.value        = true
  currentIndex.value   = 0
  selectedAnswer.value = null
  answered.value       = false
  score.value          = 0
  answers.value        = []
  submitResult.value   = null
  submitError.value    = ''
  startTime.value      = 0
  try {
    const { data }  = await api.get(`/exercises/${exerciseType.value}/${level.value}?count=10`)
    questions.value = data.questions || []
    quizId.value    = data.quizId || ''
  } catch {
    questions.value = []
  } finally {
    loading.value = false
  }
}

/** 選擇答案 */
function selectAnswer(opt) {
  if (answered.value) return
  selectedAnswer.value = opt
  answered.value       = true

  const q = currentQ.value
  if (opt === q.answer) score.value++

  // 收集答案記錄
  answers.value.push({ questionId: q.id, answer: opt })

  // 第一題開始計時
  if (!startTime.value) startTime.value = Date.now()
}

/** 下一題，若是最後一題則自動提交 */
async function nextQuestion() {
  selectedAnswer.value = null
  answered.value       = false
  currentIndex.value++

  // 所有題目已答完 → 提交到 API（不 replace 路由，讓結果畫面顯示）
  if (currentIndex.value >= total.value) {
    await submitQuiz()
    return  // ← 提早 return，不觸發 router.replace，讓 isFinished 顯示結果畫面
  }
}

/** 提交測驗結果到伺服器 */
async function submitQuiz() {
  if (!quizId.value) return
  const timeTaken = startTime.value ? Math.round((Date.now() - startTime.value) / 1000) : null
  try {
    const { data } = await api.post('/quiz/submit', {
      quizId:   quizId.value,
      answers:  answers.value,
      timeTaken
    })
    submitResult.value = data
  } catch (e) {
    submitError.value = e.response?.data?.error || '提交時發生錯誤'
  }
}

/** 換模式/等級 */
function switchMode(type) {
  exerciseType.value = type
  if (type !== 'dict') loadQuestions()
}
function switchLevel(l) {
  level.value = l
  if (exerciseType.value !== 'dict') loadQuestions()
}
function restart() { loadQuestions() }

/** 選項樣式 */
function getOptionClass(opt) {
  if (!answered.value)          return ''
  if (opt === currentQ.value.answer) return 'option-btn--correct'
  if (opt === selectedAnswer.value)  return 'option-btn--wrong'
  return ''
}

// ════════════════════════════════════════════════════════════
// 辞典模式（Jisho API）
// ════════════════════════════════════════════════════════════

/** 搜尋 Jisho 辞典 */
async function searchDict() {
  const q = dictQuery.value.trim()
  if (!q) return
  dictLoading.value = true
  dictError.value   = ''
  dictQueried.value = true
  try {
    const { data } = await api.get(`/dict/search?q=${encodeURIComponent(q)}&limit=10`)
    // data.items 是 cleanedItems （已由後端清洗）
    dictResults.value = data.items || []
    if (data.fallback) dictError.value = '外部 API 暫無法使用'
  } catch (e) {
    dictError.value   = e.response?.data?.error || 'Jisho 查詢失敗'
    dictResults.value = []
  } finally {
    dictLoading.value = false
  }
}

/**
 * 一鍵把 Jisho 單字加入筆記 SRS
 * @param {import('../server/services/ExternalApiService.js').CleanedVocabItem} item
 */
async function addDictWordToNotes(item) {
  try {
    await api.post('/notes', {
      contentType: 'vocab',
      contentId:   item.id,
      text:        `${item.kanji}（${item.reading}）— ${item.meaning}`,
      tags:        [item.level, 'jisho', ...(item.tags.slice(0, 2))]
    })
    // 更新 Set （reactive Set 需要重新赋値才觸發重繪）
    notedItems.value = new Set([...notedItems.value, item.id])
  } catch (e) {
    console.error('存入筆記失敗', e)
  }
}

onMounted(loadQuestions)
</script>

<style scoped>
.fade-enter-active,.fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from,.fade-leave-to       { opacity: 0; }
</style>
