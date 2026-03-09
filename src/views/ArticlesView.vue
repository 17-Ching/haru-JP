<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-white mb-6">📖 每日推薦文章</h1>

    <div v-if="loading" class="flex justify-center py-20 text-gray-400">載入中...</div>

    <div v-else-if="articles.length" class="grid gap-4">
      <article v-for="a in articles" :key="a.id"
               class="glass-card p-6 cursor-pointer hover:scale-[1.01] transition-transform"
               @click="selected = (selected?.id === a.id ? null : a)">
        <!-- 文章頭部 -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <h2 class="text-lg font-semibold text-white font-jp leading-snug"
              v-html="a.title" />
          <div class="flex gap-2 shrink-0">
            <span :class="`level-badge level-badge--${a.level}`">{{ a.level }}</span>
            <span class="level-badge" style="background:rgba(255,255,255,0.05);color:#6b7280;border-color:rgba(255,255,255,0.08)">
              {{ a.topic }}
            </span>
          </div>
        </div>

        <p class="text-xs text-gray-500">{{ a.wordCount }} 字　·　{{ formatDate(a.publishedAt) }}</p>

        <!-- 展開文章內容 -->
        <Transition name="expand">
          <div v-if="selected?.id === a.id" class="mt-4 pt-4 border-t border-white/5">
            <div class="text-gray-200 text-sm leading-relaxed font-jp"
                 v-html="a.content" />
            <div class="flex gap-3 mt-4">
              <button @click.stop="saveNote(a)" class="btn-ghost text-xs px-3 py-1.5">
                📝 加入筆記
              </button>
              <button @click.stop="practice(a)" class="btn-primary text-xs px-3 py-1.5">
                ✍️ 閱讀練習
              </button>
            </div>
          </div>
        </Transition>
      </article>
    </div>

    <div v-else class="glass-card p-8 text-center text-gray-400">
      <p class="text-4xl mb-3">📭</p>
      <p>今日暫無推薦文章</p>
    </div>

    <!-- 儲存成功 Toast -->
    <Transition name="toast">
      <div v-if="toastMsg"
           class="fixed bottom-6 right-6 bg-space-700 border border-primary-500/30 text-white
                  text-sm px-4 py-3 rounded-xl shadow-card z-50">
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api.js'

const router   = useRouter()
const articles = ref([])
const loading  = ref(false)
const selected = ref(null)
const toastMsg = ref('')

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/articles/daily')
    articles.value = data.articles || []
  } catch { articles.value = [] }
  finally { loading.value = false }
})

/** 格式化日期 */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('zh-TW', { month:'long', day:'numeric' })
}

/** 加入筆記 */
async function saveNote(article) {
  try {
    await api.post('/notes', {
      contentType: 'custom',
      text:        `文章：${article.title.replace(/<[^>]+>/g, '')}`,
      tags:        [article.level, article.topic]
    })
    showToast('✅ 已加入筆記！')
  } catch { showToast('❌ 儲存失敗') }
}

/** 前往閱讀練習 */
function practice(article) {
  router.push(`/exercise/reading/${article.level}`)
}

/** Toast 通知 */
function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}
</script>

<style scoped>
.expand-enter-active,.expand-leave-active { transition: all 0.3s ease; max-height: 600px; }
.expand-enter-from,.expand-leave-to       { opacity: 0; max-height: 0; overflow: hidden; }

.toast-enter-active,.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from,.toast-leave-to       { opacity: 0; transform: translateY(8px); }
</style>
