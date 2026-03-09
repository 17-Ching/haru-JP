<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">📝 錯題筆記</h1>
      <button @click="filterDue = !filterDue"
              :class="['btn-ghost text-xs px-3 py-2',
                        filterDue ? '!border-accent-400/40 !text-accent-400' : '']">
        {{ filterDue ? '✅ 顯示待複習' : '全部顯示' }}
      </button>
    </div>

    <!-- 複習模式橫幅 -->
    <div v-if="dueNotes.length && !filterDue"
         class="mb-5 flex items-center justify-between glass-card px-5 py-3 border-accent-400/20 !border">
      <p class="text-sm text-accent-400 font-medium">
        ⏰ 你有 <strong>{{ dueNotes.length }}</strong> 則筆記待今日複習
      </p>
      <button @click="startReview" class="btn-primary text-xs px-3 py-1.5">開始複習</button>
    </div>

    <div v-if="loading" class="text-center py-20 text-gray-400">載入中...</div>

    <!-- 複習模式 -->
    <div v-else-if="reviewMode && reviewQueue.length" class="fade-in-up">
      <ReviewCard :note="reviewQueue[reviewIdx]"
                  :total="reviewQueue.length"
                  :current="reviewIdx"
                  @quality="submitReview" />
    </div>

    <!-- 筆記列表 -->
    <div v-else-if="displayedNotes.length" class="flex flex-col gap-3">
      <div v-for="note in displayedNotes" :key="note.id" class="glass-card p-4">
        <div class="flex items-start justify-between gap-2 mb-2">
          <p class="text-sm text-gray-200 font-jp leading-relaxed">{{ note.text }}</p>
          <div class="flex gap-1 shrink-0">
            <span v-for="tag in note.tags" :key="tag"
                  :class="`level-badge level-badge--${tag} !text-[10px]`">{{ tag }}</span>
          </div>
        </div>
        <div class="flex items-center gap-4 text-xs text-gray-600">
          <span>下次複習：{{ formatDate(note.srsData.nextReview) }}</span>
          <span>難度係數：{{ note.srsData.easeFactor }}</span>
        </div>
      </div>
    </div>

    <div v-else class="glass-card p-8 text-center text-gray-400">
      <p class="text-4xl mb-3">📭</p>
      <p>{{ filterDue ? '今日無待複習筆記' : '尚未有筆記，從練習中加入吧！' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineComponent, h, onMounted } from 'vue'
import api from '@/utils/api.js'

const notes      = ref([])
const loading    = ref(false)
const filterDue  = ref(false)
const reviewMode = ref(false)
const reviewIdx  = ref(0)

const today       = new Date().toDateString()
const dueNotes    = computed(() => notes.value.filter(n => new Date(n.srsData.nextReview).toDateString() <= today))
const reviewQueue = ref([])
const displayedNotes = computed(() => filterDue.value ? dueNotes.value : notes.value)

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/notes')
    notes.value   = data.items || []
  } finally { loading.value = false }
})

function startReview() {
  reviewQueue.value = [...dueNotes.value]
  reviewIdx.value   = 0
  reviewMode.value  = true
}

async function submitReview({ noteId, quality }) {
  try {
    await api.post('/notes/review', { noteId, quality })
  } catch { /* 靜默 */ }
  if (reviewIdx.value + 1 < reviewQueue.value.length) {
    reviewIdx.value++
  } else {
    reviewMode.value = false
    const { data } = await api.get('/notes')
    notes.value = data.items || []
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('zh-TW')
}

// ── ReviewCard 子組件（SM-2 評分 UI）──────────────────
const ReviewCard = defineComponent({
  props: { note: Object, total: Number, current: Number },
  emits: ['quality'],
  setup(props, { emit }) {
    const revealed = ref(false)
    const RATINGS  = [
      { q:0, label:'完全忘記', color:'text-red-400', bg:'bg-red-500/10' },
      { q:2, label:'有些模糊', color:'text-orange-400', bg:'bg-orange-500/10' },
      { q:3, label:'稍有猶豫', color:'text-yellow-400', bg:'bg-yellow-500/10' },
      { q:5, label:'完美記得', color:'text-green-400', bg:'bg-green-500/10' },
    ]
    return () => h('div', { class: 'glass-card p-6 fade-in-up' }, [
      h('p', { class:'text-xs text-gray-500 mb-4' }, `複習進度 ${props.current+1}/${props.total}`),
      h('p', { class:'text-white font-jp text-lg leading-relaxed mb-6' }, props.note?.text),
      !revealed.value
        ? h('button', { class:'btn-primary w-full', onClick:()=>{ revealed.value = true }}, '顯示評分')
        : h('div', { class:'grid grid-cols-2 sm:grid-cols-4 gap-2' },
            RATINGS.map(r => h('button', {
              class: `rounded-xl py-3 text-sm font-semibold ${r.bg} ${r.color} hover:opacity-80 transition-opacity`,
              onClick: () => { revealed.value = false; emit('quality', { noteId: props.note.id, quality: r.q }) }
            }, r.label))
          )
    ])
  }
})
</script>
