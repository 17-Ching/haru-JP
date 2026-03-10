// server/index.js — 哈魯日文學習平台 API Server
import "dotenv/config";
import express from "express";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createRequire } from "module";
import apiRouter from "./routes/api.js";
import authRouter from "./routes/auth.js";
import dictRouter from "./routes/dictionary.js";
import newsRouter from "./routes/news.js";
import { getCacheStats } from "./services/ExternalApiService.js";

const require = createRequire(import.meta.url);
const app = express();
const PORT = process.env.PORT || 3000;

// Railway / Vercel 等平台都有 reverse proxy，需信任一層
app.set("trust proxy", 1);

// ── Middleware ──────────────────────────────────────────
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5173"
).split(",");
app.use(cors({ origin: allowedOrigins, credentials: true }));
// OPTIONS preflight — 必須在 rateLimit 之前先放行
app.options("*", cors({ origin: allowedOrigins, credentials: true }));
app.use(compression());
app.use(express.json());

// 全局速率限制：每15分鐘最多 200 次請求
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "請求過於頻繁，請稍後再試" },
  }),
);

// ── Routes ───────────────────────────────────────────────────────
app.use("/api/v1/auth", authRouter); // 登入 / 註冊
app.use("/api/v1/dict", dictRouter); // Jisho 辞典 Proxy ← 新增
app.use("/api/v1/news", newsRouter); // NHK News Proxy ← 新增
app.use("/api/v1", apiRouter); // 開等筆記/文章等...

// 健康檢查
app.get("/health", (_req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() }),
);

// 快取統計（開發除錯用）
app.get("/cache-stats", (_req, res) => res.json(getCacheStats()));

// 404 兜底
app.use((_req, res) => res.status(404).json({ error: "找不到此路由" }));

// 全局錯誤處理
app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err);
  res.status(500).json({ error: "伺服器內部錯誤" });
});

app.listen(PORT, () => {
  console.log(`✅ 哈魯日文 API Server running → http://localhost:${PORT}`);
});
