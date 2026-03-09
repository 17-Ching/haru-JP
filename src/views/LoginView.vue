<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm fade-in-up">
      <!-- 標頭 -->
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">🌌</div>
        <h1 class="text-2xl font-bold text-white">哈魯日語</h1>
        <p class="text-gray-400 text-sm mt-1">歡迎回來，繼續你的日語旅程</p>
      </div>

      <!-- 卡片 -->
      <div class="glass-card p-6">
        <!-- 模式切換 -->
        <div class="flex rounded-lg overflow-hidden border border-white/10 mb-6">
          <button @click="mode = 'login'"
                  :class="['flex-1 py-2 text-sm font-medium transition-colors',
                            mode==='login' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:text-white']">
            登入
          </button>
          <button @click="mode = 'register'"
                  :class="['flex-1 py-2 text-sm font-medium transition-colors',
                            mode==='register' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:text-white']">
            註冊
          </button>
        </div>

        <!-- 登入表單 -->
        <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
          <div v-if="mode==='register'">
            <label class="block text-xs text-gray-400 mb-1">使用者名稱</label>
            <input v-model="form.username" type="text" required placeholder="yamada_taro"
                   class="w-full bg-space-700 border border-white/10 rounded-lg px-3 py-2.5 text-sm
                          text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50
                          focus:ring-1 focus:ring-primary-500/30 transition-colors" />
          </div>

          <div>
            <label class="block text-xs text-gray-400 mb-1">Email</label>
            <input v-model="form.email" type="email" required placeholder="you@example.com"
                   class="w-full bg-space-700 border border-white/10 rounded-lg px-3 py-2.5 text-sm
                          text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50
                          focus:ring-1 focus:ring-primary-500/30 transition-colors" />
          </div>

          <div>
            <label class="block text-xs text-gray-400 mb-1">密碼</label>
            <input v-model="form.password" type="password" required placeholder="••••••••"
                   class="w-full bg-space-700 border border-white/10 rounded-lg px-3 py-2.5 text-sm
                          text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50
                          focus:ring-1 focus:ring-primary-500/30 transition-colors" />
          </div>

          <div v-if="mode==='register'">
            <label class="block text-xs text-gray-400 mb-1">目標 JLPT 等級</label>
            <select v-model="form.level"
                    class="w-full bg-space-700 border border-white/10 rounded-lg px-3 py-2.5 text-sm
                           text-white focus:outline-none focus:border-primary-500/50 transition-colors">
              <option v-for="l in ['N5','N4','N3','N2','N1']" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>

          <!-- 錯誤訊息 -->
          <p v-if="error" class="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {{ error }}
          </p>

          <button type="submit" :disabled="loading" class="btn-primary mt-1">
            <span v-if="loading">{{mode==='login' ? '登入中...' : '註冊中...'}}</span>
            <span v-else>{{mode==='login' ? '登入' : '建立帳號'}}</span>
          </button>
        </form>
      </div>

      <!-- 快速測試帳號提示 -->
      <p class="text-center text-xs text-gray-600 mt-4">
        開發模式：可任意輸入 email + 密碼先行註冊
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore.js'

const router    = useRouter()
const route     = useRoute()
const userStore = useUserStore()

const mode    = ref('login')
const loading = ref(false)
const error   = ref('')
const form    = reactive({ username: '', email: '', password: '', level: 'N5' })

async function handleSubmit() {
  error.value   = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await userStore.login(form.email, form.password)
    } else {
      await userStore.register(form.username, form.email, form.password, form.level)
    }
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    error.value = e.response?.data?.error || '發生錯誤，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>
