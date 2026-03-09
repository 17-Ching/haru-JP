# 哈魯物理系統設計 — GravityComponent 構思文件
> 創意互動設計師 × 資深全端架構師 聯合討論

---

## 一、設計原則

```
┌─────────────────────────────────────────────────────┐
│              簡約悖論 (Minimalism Paradox)            │
│                                                      │
│  「最豐富的效果 = 最少的 UI 干擾」                    │
│                                                      │
│  ● 重力層永遠在內容層之後 (z-index 分離)              │
│  ● 效果隨使用者操作而呼應，非自動循環干擾              │
│  ● 低端設備自動降級（Reduced Motion 模式）             │
└─────────────────────────────────────────────────────┘
```

---

## 二、核心場景設計

### 場景 A：假名掉落背景（FallingKana）
> 適用頁面：首頁儀表板、載入畫面

```
螢幕頂部
    │   あ  ─── 以隨機初速落下
    │       い  ─── 帶有輕微橫向漂移
    │   う  ─── 透明度 0.08 ~ 0.15（不干擾閱讀）
    │       え
    │   お
    ▼
螢幕底部（假名消失，不堆積）
```

**實作選擇：Web Animations API（優先）**
```js
// composables/useGravityEngine.js
export function useFallingKana(containerEl, options = {}) {
  const {
    chars = ['あ','い','う','え','お','か','き','く','け','こ'],
    count = 15,         // 同時在場字符數
    opacity = 0.10,     // 基礎透明度
    reduced = false     // prefers-reduced-motion
  } = options

  if (reduced) return  // 尊重系統動畫偏好

  function spawnKana() {
    const el = document.createElement('span')
    el.textContent = chars[Math.floor(Math.random() * chars.length)]
    el.className = 'falling-kana'
    el.style.cssText = `
      position: absolute;
      left: ${Math.random() * 100}%;
      top: -2rem;
      font-size: ${1 + Math.random() * 1.5}rem;
      opacity: ${opacity * (0.5 + Math.random())};
      font-family: 'Noto Sans JP', sans-serif;
    `
    containerEl.appendChild(el)

    const duration = 4000 + Math.random() * 4000
    const drift = (Math.random() - 0.5) * 80  // 橫向漂移 px

    el.animate([
      { transform: 'translateY(0) translateX(0)', opacity: el.style.opacity },
      { transform: `translateY(100vh) translateX(${drift}px)`, opacity: 0 }
    ], {
      duration,
      easing: 'cubic-bezier(0.1, 0.3, 0.6, 1.0)',  // 模擬重力加速
      fill: 'forwards'
    }).onfinish = () => {
      el.remove()
      spawnKana()  // 循環生成
    }
  }

  // 初始錯開生成
  for (let i = 0; i < count; i++) {
    setTimeout(spawnKana, Math.random() * 3000)
  }
}
```

---

### 場景 B：漂浮單字卡（FloatingCard）
> 適用頁面：單字複習、每日推薦

```
┌──────────────────────────────────────────────┐
│                 漂浮卡行為                    │
│                                               │
│  ┌────────┐          靜止時：                 │
│  │ 重力   │ ←── 緩慢上下浮動（sin 波形）      │
│  │じゅうりょく│        幅度 ±8px, 週期 3s       │
│  └────────┘                                   │
│                                               │
│  滑鼠 Hover：                                  │
│  → 輕微排斥（卡片遠離游標                      │
│  → 陰影加深，模擬「被抵抗的重力」              │
│                                               │
│  點擊翻轉：                                    │
│  → 物理翻轉（rotateY 180° + 彈跳緩動）        │
└──────────────────────────────────────────────┘
```

**GravityComponent.vue 核心架構：**
```vue
<template>
  <div
    class="gravity-card"
    :style="cardStyle"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    @click="toggleFlip"
  >
    <div class="card-inner" :class="{ flipped }">
      <div class="card-front">
        <slot name="front" />
      </div>
      <div class="card-back">
        <slot name="back" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'

export default {
  name: 'GravityCard',
  props: {
    floatAmplitude: { type: Number, default: 8 },   // 浮動幅度 px
    floatSpeed:     { type: Number, default: 3000 }, // 浮動週期 ms
    repelStrength:  { type: Number, default: 15 }    // 排斥強度 px
  },
  setup(props) {
    const flipped  = ref(false)
    const offsetX  = ref(0)
    const offsetY  = ref(0)
    const floatY   = ref(0)
    let   animFrame = null
    let   startTime = null

    // sin 波形浮動
    function animate(timestamp) {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      floatY.value = Math.sin((elapsed / props.floatSpeed) * Math.PI * 2)
                     * props.floatAmplitude
      animFrame = requestAnimationFrame(animate)
    }

    onMounted(() => { animFrame = requestAnimationFrame(animate) })
    onUnmounted(() => cancelAnimationFrame(animFrame))

    function onMouseMove(e) {
      const rect = e.currentTarget.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top  + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      // 排斥：游標越近，偏移越大
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = Math.min(props.repelStrength, props.repelStrength * 50 / dist)
      offsetX.value = -(dx / dist) * force
      offsetY.value = -(dy / dist) * force
    }

    function onMouseLeave() {
      offsetX.value = 0
      offsetY.value = 0
    }

    function toggleFlip() { flipped.value = !flipped.value }

    const cardStyle = computed(() => ({
      transform: `translateX(${offsetX.value}px) translateY(${floatY.value + offsetY.value}px)`,
      transition: offsetX.value === 0 ? 'transform 0.6s ease' : 'none'
    }))

    return { flipped, cardStyle, onMouseMove, onMouseLeave, toggleFlip }
  }
}
</script>
```

---

### 場景 C：Matter.js 物理引擎（進階，選用）
> 適用：歡迎頁英雄區、特殊活動頁面（非核心學習流程）

```
評估結論（架構師 × 設計師 共識）：
┌────────────────────────────────────────────────────┐
│  Matter.js                Web Animations API       │
│  ─────────────────────    ─────────────────────    │
│  ✅ 真實碰撞物理           ✅ 零依賴（瀏覽器原生）  │
│  ✅ 互動性強               ✅ GPU 加速              │
│  ❌ Bundle +90kb           ✅ 低端設備友好          │
│  ❌ 低端設備易崩潰          ❌ 無碰撞檢測            │
│                                                    │
│  → 結論：核心頁面用 Web Animations API             │
│          歡迎頁/特殊場景才載入 Matter.js            │
│          使用動態 import 懶加載                     │
└────────────────────────────────────────────────────┘
```

---

## 三、效能分層策略

```js
// useGravityEngine.js — 設備效能偵測
export function detectPerformanceTier() {
  const TIER = {
    HIGH:   'high',   // 60fps + Matter.js 可用
    MEDIUM: 'medium', // Web Animations，限 10 個同時粒子
    LOW:    'low'     // 靜態背景，完全禁用動畫
  }

  // 尊重系統設定（最高優先）
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return TIER.LOW
  }

  // 硬件偵測
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl')
  const cores = navigator.hardwareConcurrency || 2

  if (!gl || cores <= 2) return TIER.LOW
  if (cores <= 4)        return TIER.MEDIUM
  return TIER.HIGH
}
```

---

## 四、CSS 動畫補充（_gravity.scss）

```scss
// 浮動假名
.falling-kana {
  pointer-events: none;  // 永不遮蔽互動
  user-select: none;
  will-change: transform, opacity;  // GPU 層提示
  color: var(--gravity-kana-color);
}

// 重力卡片
.gravity-card {
  will-change: transform;

  .card-inner {
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);  // 彈跳感

    &.flipped { transform: rotateY(180deg); }
  }

  .card-front,
  .card-back {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;  // Safari 兼容
  }

  .card-back { transform: rotateY(180deg); }
}
```
