// server/middleware/auth.js — JWT 驗證中間件
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity-jp-dev-secret-change-in-prod'

/**
 * 驗證 Bearer Token，通過後將 user payload 掛載到 req.user
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: '未提供認證 Token' })

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token 無效或已過期' })
  }
}

export { JWT_SECRET }
