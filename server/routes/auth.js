// server/routes/auth.js — 使用者認證路由
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { JWT_SECRET } from '../middleware/auth.js'

const router = Router()

// ── 簡易記憶體 DB（生產環境請替換為真實資料庫）──────────────
/** @type {Map<string, {id:string, username:string, email:string, passwordHash:string, level:string, streak:number}>} */
const users = new Map()

// ── POST /api/v1/auth/register ───────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password, level = 'N5' } = req.body

  if (!username || !email || !password)
    return res.status(400).json({ error: '請提供 username、email 與 password' })

  const emailLower = email.toLowerCase()
  if ([...users.values()].find(u => u.email === emailLower))
    return res.status(409).json({ error: '此 Email 已被使用' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = { id: uuidv4(), username, email: emailLower, passwordHash, level, streak: 0 }
  users.set(user.id, user)

  const tokens = generateTokens(user)
  res.status(201).json({ user: safeUser(user), tokens })
})

// ── POST /api/v1/auth/login ──────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: '請提供 email 與 password' })

  const user = [...users.values()].find(u => u.email === email.toLowerCase())
  if (!user) return res.status(401).json({ error: '帳號或密碼錯誤' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: '帳號或密碼錯誤' })

  res.json({ user: safeUser(user), tokens: generateTokens(user) })
})

// ── Helpers ──────────────────────────────────────────────────
/**
 * @param {{id:string, username:string, email:string, level:string, streak:number}} user
 * @returns {{accessToken:string, refreshToken:string, expiresIn:number}}
 */
function generateTokens(user) {
  const payload = { id: user.id, username: user.username, level: user.level }
  return {
    accessToken:  jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' }),
    refreshToken: jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' }),
    expiresIn:    7200
  }
}

/** 移除敏感欄位後回傳 */
function safeUser({ id, username, email, level, streak }) {
  return { id, username, email, level, streak }
}

export default router
