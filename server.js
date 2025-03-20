const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// 🚀 GitHub Codespaces の動的 URL に対応する CORS 設定
const allowedOrigins = [
  "https://laughing-orbit-x5xrx5v6jqr6h6rx-3000.app.github.dev",
  "http://localhost:3000" // ローカル開発用
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS エラー: 許可されていないオリジンです'));
    }
  }
}));

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));

// Supabase の設定
const SUPABASE_URL = "https://gflvuocpcuiootlumzte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHZ1b2NwY3Vpb290bHVtenRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTk0NzMsImV4cCI6MjA1Nzk3NTQ3M30.Psyu6o5j_HbG1kJhqrnnhrnbznArH3JWAE_tJEKdPuA"; // APIキー
const BUCKET_NAME = "backups";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ルートページを提供
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// サーバー起動
app.listen(3000, () => {
  console.log("🚀 サーバーが http://localhost:3000 で動作中");
});
