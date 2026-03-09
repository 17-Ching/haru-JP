// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore.js'

const routes = [
  {
    path:      '/',
    name:      'Home',
    component: () => import('@/views/HomeView.vue'),
    meta:      { requiresAuth: true }
  },
  {
    path:      '/exercise/:type?/:level?',
    name:      'Exercise',
    component: () => import('@/views/ExerciseView.vue'),
    meta:      { requiresAuth: true }
  },
  {
    path:      '/articles',
    name:      'Articles',
    component: () => import('@/views/ArticlesView.vue'),
    meta:      { requiresAuth: true }
  },
  {
    path:      '/notes',
    name:      'Notes',
    component: () => import('@/views/NotesView.vue'),
    meta:      { requiresAuth: true }
  },
  {
    path:      '/login',
    name:      'Login',
    component: () => import('@/views/LoginView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局路由守衛：未登入跳轉 /login
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
