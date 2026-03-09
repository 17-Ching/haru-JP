// server/data/quizCache.js
// 全局 Quiz 快取 — 存在 process 記憶體中
// node --watch 重啟時會清空，生產環境請改用 Redis

/**
 * @type {Map<string, {questions: Object[], expiresAt: number, userId: string}>}
 */
export const quizCache = new Map()

/**
 * 存入測驗題組
 * @param {string} quizId
 * @param {Object[]} questions - 含 answer 欄位的題目
 * @param {string} userId
 */
export function cacheQuiz(quizId, questions, userId) {
  const expiresAt = Date.now() + 30 * 60 * 1000
  quizCache.set(quizId, { questions, expiresAt, userId })
  setTimeout(() => quizCache.delete(quizId), 30 * 60 * 1000)
}

/**
 * 取回並驗證測驗，回傳 null 表示不存在或已過期
 * @param {string} quizId
 * @returns {{questions: Object[], userId: string}|null}
 */
export function getQuiz(quizId) {
  const entry = quizCache.get(quizId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    quizCache.delete(quizId)
    return null
  }
  return entry
}
