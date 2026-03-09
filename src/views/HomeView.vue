<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <!-- 歡迎區 -->
    <div class="mb-8 fade-in-up">
      <h1 class="text-3xl font-bold text-white">
        おはようございます、<span class="text-primary-400">{{ userStore.user?.username }}</span> さん 👋
      </h1>
      <p class="text-gray-400 mt-1">繼續你的日語學習旅程</p>
    </div>

    <!-- 統計卡片列 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard icon="🔥" label="連勝天數" :value="`${userStore.user?.streak || 0} 天`" color="text-orange-400" />
      <StatCard icon="📚" label="當前等級" :value="userStore.userLevel" color="text-primary-400" />
      <StatCard icon="⏰" label="今日待複習" :value="`${reviewDue} 則`" color="text-accent-400" />
      <StatCard icon="✅" label="今日完成"   :value="`${todayDone} 題`"  color="text-green-400" />
    </div>

    <!-- 快速啟動 -->
    <h2 class="text-lg font-semibold text-white mb-4">快速開始練習</h2>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <QuickStart
        v-for="q in quickStarts" :key="q.type"
        :icon="q.icon" :title="q.title" :desc="q.desc"
        @click="$router.push(`/exercise/${q.type}/${userStore.userLevel}`)"
      />
    </div>

    <!-- 每日推薦文章 -->
    <DailyArticleWidget />
  </div>
</template>

<script setup>
import { ref, defineComponent, h, onMounted } from 'vue'
import { useUserStore } from '@/stores/useUserStore.js'
import api from '@/utils/api.js'
import DailyArticleWidget from '@/components/articles/DailyArticleWidget.vue'

const userStore  = useUserStore()
const reviewDue  = ref(0)
const todayDone  = ref(0)

const quickStarts = [
  { type:'vocab',   icon:'🃏', title:'單字練習',   desc:`${userStore.userLevel} 等級單字四選一` },
  { type:'grammar', icon:'📐', title:'文法填空',   desc:`${userStore.userLevel} 等級文法點測驗` },
  { type:'reading', icon:'📖', title:'閱讀測驗',   desc:`${userStore.userLevel} 等級文章理解` },
]

// 取得複習數
onMounted(async () => {
  try {
    const { data } = await api.get(`/recommend/${userStore.user?.id}`)
    reviewDue.value = data.reviewDue || 0
  } catch { /* 靜默失敗 */ }
})

// ── 子元件 ──────────────────────────────────────────────
const StatCard = defineComponent({
  props: { icon: String, label: String, value: String, color: String },
  setup: (p) => () => h('div', { class: 'glass-card p-4' }, [
    h('div', { class: 'text-2xl mb-1' }, p.icon),
    h('div', { class: `text-xl font-bold ${p.color}` }, p.value),
    h('div', { class: 'text-xs text-gray-500 mt-0.5' }, p.label),
  ])
})

const QuickStart = defineComponent({
  props: { icon: String, title: String, desc: String },
  emits: ['click'],
  setup: (p, { emit }) => () => h('button', {
    class: 'glass-card p-5 text-left w-full cursor-pointer group',
    onClick: () => emit('click')
  }, [
    h('div', { class: 'text-3xl mb-3' }, p.icon),
    h('div', { class: 'font-semibold text-white group-hover:text-primary-400 transition-colors' }, p.title),
    h('div', { class: 'text-xs text-gray-500 mt-1' }, p.desc),
  ])
})
</script>
