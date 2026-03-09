// src/stores/useUserStore.js — 使用者狀態管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api.js'

export const useUserStore = defineStore('user', () => {
  /** @type {import('vue').Ref<{id:string,username:string,email:string,level:string,streak:number}|null>} */
  const user         = ref(JSON.parse(localStorage.getItem('jp_user') || 'null'))
  const accessToken  = ref(localStorage.getItem('jp_token') || '')

  const isLoggedIn   = computed(() => !!accessToken.value)
  const userLevel    = computed(() => user.value?.level || 'N5')

  /**
   * @param {string} email
   * @param {string} password
   */
  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    setSession(data.user, data.tokens.accessToken)
  }

  /**
   * @param {string} username
   * @param {string} email
   * @param {string} password
   * @param {string} [level]
   */
  async function register(username, email, password, level = 'N5') {
    const { data } = await api.post('/auth/register', { username, email, password, level })
    setSession(data.user, data.tokens.accessToken)
  }

  function logout() {
    user.value        = null
    accessToken.value = ''
    localStorage.removeItem('jp_user')
    localStorage.removeItem('jp_token')
  }

  /**
   * @param {{id:string,username:string,email:string,level:string,streak:number}} userData
   * @param {string} token
   */
  function setSession(userData, token) {
    user.value        = userData
    accessToken.value = token
    localStorage.setItem('jp_user',  JSON.stringify(userData))
    localStorage.setItem('jp_token', token)
  }

  return { user, isLoggedIn, userLevel, login, register, logout, accessToken }
})
