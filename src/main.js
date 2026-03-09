// src/main.js — 哈魯日文學習平台 Vue 3 入口
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './assets/styles/main.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
