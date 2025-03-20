// 必要なパッケージのインポート
const express = require('express');
const cors = require('cors'); // 追加
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { createClient } = require('@supabase/supabase-js');
const app = express();

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors()); // これですべてのドメインからのリクエストを受け入れる

// Supabaseの設定
const SUPABASE_URL = "https://gflvuocpcuiootlumzte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHZ1b2NwY3Vpb290bHVtenRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTk0NzMsImV4cCI6MjA1Nzk3NTQ3M30.Psyu6o5j_HbG1kJhqrnnhrnbznArH3JWAE_tJEKdPuA"; // あなたのAPIキー
const BUCKET_NAME = "backups"; // バケット名
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// サーバーのルートパスにアクセスしたときにindex.htmlを返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ファイルアップロード処理など
// （他のコードはそのまま）
app.listen(3000, () => {
  console.log("サーバーが http://localhost:3000 で動作中");
});
