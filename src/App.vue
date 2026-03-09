<template>
  <div class="min-h-screen bg-space-900 relative">
    <!-- 哈魯假名背景層 -->
    <div ref="gravityLayerRef" class="gravity-layer" aria-hidden="true" />

    <!-- 導覽列 -->
    <nav v-if="userStore.isLoggedIn"
         class="sticky top-0 z-50 border-b border-white/5"
         style="background:rgba(10,14,26,0.85); backdrop-filter:blur(16px)">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center gap-2 group">
          <span class="text-xl">🌌</span>
          <span class="font-bold text-white group-hover:text-primary-400 transition-colors">
            哈魯日語
          </span>
          <span class="text-xs text-gray-500 hidden sm:block">Anti-gravity JP</span>
        </RouterLink>

        <!-- 導覽連結 -->
        <div class="flex items-center gap-1">
          <NavLink to="/"           icon="🏠" label="首頁"   />
          <NavLink to="/exercise"   icon="✍️" label="練習"   />
          <NavLink to="/articles"   icon="📖" label="文章"   />
          <NavLink to="/notes"      icon="📝" label="筆記"   />
        </div>

        <!-- 使用者資訊 -->
        <div class="flex items-center gap-3">
          <span :class="`level-badge level-badge--${userStore.userLevel}`">
            {{ userStore.userLevel }}
          </span>
          <button @click="userStore.logout(); $router.push('/login')"
                  class="text-gray-400 hover:text-white transition-colors text-sm">
            登出
          </button>
        </div>
      </div>
    </nav>

    <!-- 主內容區 -->
    <main class="relative z-10">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="$route.fullPath" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView, RouterLink, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore.js'

const userStore      = ref(useUserStore())
const gravityLayerRef = ref(null)
let   animationIds   = []

// 假名清單
const KANA = ['あ','い','う','え','お','か','き','く','け','こ',
               'さ','し','す','せ','そ','な','に','ぬ','の',
               'は','ひ','ふ','へ','ほ','ま','み','む','め','も',
               'ら','り','る','れ','ろ','わ','を','ん']

// 偵測是否應啟用動畫
const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

function spawnKana() {
  if (!gravityLayerRef.value || !motionOk) return
  const el = document.createElement('span')
  el.className   = 'falling-kana'
  el.textContent = KANA[Math.floor(Math.random() * KANA.length)]

  const size    = 0.9 + Math.random() * 1.4
  const opacity = 0.06 + Math.random() * 0.08
  const drift   = (Math.random() - 0.5) * 100
  const duration = 5000 + Math.random() * 5000

  el.style.cssText = `
    left: ${Math.random() * 100}%;
    top: -2rem;
    font-size: ${size}rem;
    opacity: ${opacity};
  `
  gravityLayerRef.value.appendChild(el)

  const anim = el.animate([
    { transform: 'translateY(0) translateX(0)',              opacity },
    { transform: `translateY(102vh) translateX(${drift}px)`, opacity: 0 }
  ], { duration, easing: 'cubic-bezier(0.1,0.3,0.6,1.0)', fill: 'forwards' })

  anim.onfinish = () => { el.remove(); spawnKana() }
}

onMounted(() => {
  if (!motionOk) return
  // 錯開生成 12 個假名
  for (let i = 0; i < 12; i++) {
    const id = setTimeout(spawnKana, Math.random() * 4000)
    animationIds.push(id)
  }
})

onUnmounted(() => animationIds.forEach(clearTimeout))
</script>

<script>
// NavLink 子組件（kebab-case 無需 TS）
import { defineComponent, h } from 'vue'
import { RouterLink, useLink } from 'vue-router'

const NavLink = defineComponent({
  props: { to: String, icon: String, label: String },
  setup(props) {
    const { isActive } = useLink({ to: props.to })
    return () => h(RouterLink, {
      to: props.to,
      class: [
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive.value
          ? 'bg-primary-500/20 text-primary-400'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      ]
    }, () => [props.icon, ' ', props.label])
  }
})

export default { components: { NavLink } }
</script>

<style scoped>
/* 頁面過渡動畫 */
.page-enter-active,
.page-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.page-enter-from   { opacity: 0; transform: translateY(8px); }
.page-leave-to     { opacity: 0; transform: translateY(-8px); }
</style>
