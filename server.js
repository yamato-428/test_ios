const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// ✅ CORS 設定（GitHub Codespaces の動的 URL を許可）
const allowedOrigins = [
  "http://localhost:3000", // ローカル開発
  /\.app\.github\.dev$/ // GitHub Codespaces の動的サブドメインを許可（正規表現）
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.some(pattern => pattern instanceof RegExp ? pattern.test(origin) : pattern === origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS エラー: 許可されていないオリジンです'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type"
}));

// ✅ 静的ファイルを提供（manifest.json も含む）
app.use(express.static(path.join(__dirname, 'public')));

// ✅ manifest.json への CORS 設定
app.options('/manifest.json', (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

app.get('/manifest.json', (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// ✅ Supabase の設定
const SUPABASE_URL = "https://gflvuocpcuiootlumzte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHZ1b2NwY3Vpb290bHVtenRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTk0NzMsImV4cCI6MjA1Nzk3NTQ3M30.Psyu6o5j_HbG1kJhqrnnhrnbznArH3JWAE_tJEKdPuA";
const BUCKET_NAME = "backups";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ ルートページを提供
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ CORS エラーハンドリング
app.use((err, req, res, next) => {
  if (err.message.startsWith('CORS エラー')) {
    res.status(403).json({ error: err.message });
  } else {
    next(err);
  }
});

// ✅ サーバー起動
app.listen(3000, () => {
  console.log("🚀 サーバーが http://localhost:3000 で動作中");
});
