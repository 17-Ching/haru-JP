<template>
  <div>
    <h2 class="text-lg font-semibold text-white mb-4">📰 今日推薦文章</h2>
    <div v-if="loading" class="glass-card p-4 text-sm text-gray-500 text-center">載入中...</div>
    <div v-else-if="articles.length" class="flex flex-col gap-3">
      <RouterLink v-for="a in articles" :key="a.id"
                  to="/articles"
                  class="glass-card p-4 flex items-center justify-between gap-3 hover:no-underline">
        <div class="min-w-0">
          <p class="text-sm font-medium text-white font-jp truncate" v-html="a.title" />
          <p class="text-xs text-gray-500 mt-0.5">{{ a.topic }} · {{ a.wordCount }} 字</p>
        </div>
        <span :class="`level-badge level-badge--${a.level} shrink-0`">{{ a.level }}</span>
      </RouterLink>
    </div>
    <p v-else class="text-sm text-gray-500">今日暫無推薦</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/utils/api.js'

const articles = ref([])
const loading  = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const { data } = await api.get('/articles/daily')
    articles.value = data.articles?.slice(0, 3) || []
  } catch { articles.value = [] }
  finally  { loading.value = false }
})
</script>
