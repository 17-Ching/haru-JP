# Tailwind + Sass 樣式策略文件
> 創意互動設計師 主導

---

## 一、設計哲學

```
「在無重力混沌中，保持視覺秩序」

重力層（Chaos）    ←→    內容層（Order）
────────────────────────────────────────
・假名掉落               ・清晰的卡片與文字
・物理粒子漂移            ・單一焦點佈局
・隨機透明度              ・一致的間距系統
・低飽和色彩              ・高對比主要資訊
```

---

## 二、設計 Token（_variables.scss）

```scss
// ══════════════════════════════════════════
//  設計 Token — 哈魯主題
//  統一在此定義，Tailwind + Sass 共用
// ══════════════════════════════════════════

// ── 色彩系統 ──
// 主色：深空藍（象徵無重力宇宙）
:root {
  // 背景層
  --color-bg-base:      #0a0e1a;   // 深夜宇宙
  --color-bg-surface:   #111827;   // 卡片背景
  --color-bg-elevated:  #1f2937;   // Hover / Focus 背景

  // 主色調：極光紫藍
  --color-primary-400:  #818cf8;   // 亮色（文字強調）
  --color-primary-500:  #6366f1;   // 主色（按鈕）
  --color-primary-600:  #4f46e5;   // 深色（Pressed）

  // 輔色：螢光青（重力效果高光）
  --color-accent-300:   #67e8f9;   // 最亮
  --color-accent-400:   #22d3ee;   // 主輔色
  --color-accent-500:   #06b6d4;   // 深輔色

  // 語意色
  --color-success:      #4ade80;
  --color-warning:      #fbbf24;
  --color-danger:       #f87171;

  // 文字
  --color-text-primary:   #f9fafb;   // 主要文字
  --color-text-secondary: #9ca3af;   // 次要文字
  --color-text-muted:     #4b5563;   // 禁用/虛化

  // 重力層專用（保持半透明，不搶主內容）
  --gravity-kana-color:   rgba(99, 102, 241, 0.12);
  --gravity-particle-glow: rgba(34, 211, 238, 0.08);

  // ── 間距系統（4px 基準）──
  --space-1:  0.25rem;   //  4px
  --space-2:  0.5rem;    //  8px
  --space-3:  0.75rem;   // 12px
  --space-4:  1rem;      // 16px
  --space-6:  1.5rem;    // 24px
  --space-8:  2rem;      // 32px
  --space-12: 3rem;      // 48px
  --space-16: 4rem;      // 64px

  // ── 圓角 ──
  --radius-sm:  0.375rem;  //  6px
  --radius-md:  0.75rem;   // 12px
  --radius-lg:  1.25rem;   // 20px
  --radius-xl:  2rem;      // 32px
  --radius-full: 9999px;

  // ── 陰影（帶色彩的深度感）──
  --shadow-card:  0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08);
  --shadow-hover: 0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(99,102,241,0.15);
  --shadow-glow:  0 0 24px rgba(34,211,238,0.25);

  // ── 字體 ──
  --font-sans:    'Inter', 'Noto Sans JP', sans-serif;
  --font-jp:      'Noto Sans JP', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  // ── 動畫緩動 ──
  --ease-bounce:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);
  --ease-gravity: cubic-bezier(0.1, 0.3, 0.6, 1.0);  // 模擬重力加速

  // ── Z-Index 分層 ──
  --z-gravity-bg:   0;      // 最底：重力粒子背景
  --z-content:     10;      // 主要內容
  --z-cards:       20;      // 漂浮卡片
  --z-nav:        100;      // 導覽列
  --z-modal:      200;      // Modal
  --z-toast:      300;      // 通知
}
```

---

## 三、Tailwind 設定（tailwind.config.js）

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{vue,js,html}'],
  darkMode: 'class',  // 預設暗色主題
  theme: {
    extend: {
      colors: {
        // 對應 CSS 變數（讓 Tailwind class 可用）
        'space': {
          900: '#0a0e1a',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
        },
        'primary': {
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        'accent': {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
        }
      },
      fontFamily: {
        sans: ["'Inter'", "'Noto Sans JP'", 'sans-serif'],
        jp:   ["'Noto Sans JP'", 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      boxShadow: {
        'card':  '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08)',
        'hover': '0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(99,102,241,0.15)',
        'glow':  '0 0 24px rgba(34,211,238,0.25)',
      },
      borderRadius: {
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      // 重力動畫
      animation: {
        'float-slow':  'float 3s ease-in-out infinite',
        'float-fast':  'float 2s ease-in-out infinite',
        'pulse-glow':  'pulseGlow 2s ease-in-out infinite',
        'fall-kana':   'fallKana 6s ease-in forwards',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.6', boxShadow: '0 0 8px rgba(34,211,238,0.2)' },
          '50%':     { opacity: '1',   boxShadow: '0 0 24px rgba(34,211,238,0.5)' },
        },
        fallKana: {
          '0%':   { transform: 'translateY(-2rem)', opacity: '0.12' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        }
      }
    }
  },
  plugins: []
}
```

---

## 四、全局 Sass 入口（main.scss）

```scss
// main.scss — 按依賴順序匯入
@import 'variables';      // Token 定義
@import 'typography';     // 字體設定
@import 'base';           // Reset + 基礎元素
@import 'gravity';        // 重力層樣式
@import 'glass';          // 玻璃態元件
@import 'jlpt-badges';    // N5~N1 徽章
@import 'animations';     // 全局動畫工具類
```

---

## 五、玻璃態卡片（_glass.scss）

```scss
// 玻璃態（Glassmorphism）— 簡約核心元件
.glass-card {
  background: rgba(31, 41, 55, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.3s var(--ease-smooth),
              transform  0.3s var(--ease-smooth);

  &:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
  }

  // 重力效果高光線（頂部細邊）
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      135deg,
      rgba(255,255,255,0.06) 0%,
      transparent 50%
    );
    pointer-events: none;
  }
}

// 選中/Active 狀態：發光邊框
.glass-card--active {
  border-color: var(--color-primary-500);
  box-shadow: var(--shadow-glow);
}
```

---

## 六、JLPT 等級徽章（_jlpt-badges.scss）

```scss
.level-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;

  &--N5 { background: rgba(74, 222, 128, 0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
  &--N4 { background: rgba(34, 211, 238, 0.15); color: #22d3ee; border: 1px solid rgba(34,211,238,0.3); }
  &--N3 { background: rgba(129,140, 248, 0.15); color: #818cf8; border: 1px solid rgba(129,140,248,0.3); }
  &--N2 { background: rgba(251,191, 36,  0.15); color: #fbbf24; border: 1px solid rgba(251,191,36, 0.3); }
  &--N1 { background: rgba(248,113,113, 0.15);  color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
}
```

---

## 七、簡約折衷設計規範

```
┌──────────────────────────────────────────────────────┐
│           無重力混沌 × 簡約直覺 的折衷方案             │
├──────────────────────────────────────────────────────┤
│                                                      │
│  規則 1：「重力永遠服務於內容，而非競爭」             │
│          所有重力效果 opacity < 0.15                 │
│          z-index 永遠低於內容層                      │
│                                                      │
│  規則 2：「動靜分區」                                │
│          學習核心區（單字/文法/考試）= 靜            │
│          過渡/儀表板/歡迎頁             = 動          │
│                                                      │
│  規則 3：「一次一種動畫」                            │
│          卡片漂浮時 → 不同時觸發假名掉落             │
│          翻轉動畫時 → 暫停浮動                       │
│                                                      │
│  規則 4：「Reduced Motion 第一公民」                 │
│          所有動畫必須有靜態降級                      │
│          @media (prefers-reduced-motion) {} 必填      │
│                                                      │
│  規則 5：「色彩 = 功能信號」                         │
│          青色(accent) = 互動元素                     │
│          主色(primary)= 主要 CTA                     │
│          重力效果僅用主色低透明度                    │
└──────────────────────────────────────────────────────┘
```
