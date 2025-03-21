const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const app = express();
ffmpeg.setFfmpegPath(ffmpegPath);

// ✅ CORS 設定
const allowedOrigins = [
  "http://localhost:3000", // ローカル開発
  /\.app\.github\.dev$/ // GitHub Codespaces の動的サブドメインを許可
];

app.use(cors({
  origin: "*",  // 🔥 一時的にすべてのオリジンを許可
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type"
}));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// ✅ 静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Supabase の設定
const SUPABASE_URL = "https://gflvuocpcuiootlumzte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHZ1b2NwY3Vpb290bHVtenRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTk0NzMsImV4cCI6MjA1Nzk3NTQ3M30.Psyu6o5j_HbG1kJhqrnnhrnbznArH3JWAE_tJEKdPuA";
const BUCKET_NAME = "backups";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ ファイルアップロード設定
const upload = multer({ dest: 'uploads/' }); // 一時保存用ディレクトリ

// ✅ ルートページを提供
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ 動画処理ルート
app.post('/process-video', upload.single('video'), async (req, res) => {
  const inputFilePath = req.file.path; // アップロードされた動画のパス
  const outputFileName = `compressed_${Date.now()}.mp4`;
  const outputFilePath = `uploads/${outputFileName}`;

  try {
    // 動画を圧縮・リサイズ
    await new Promise((resolve, reject) => {
      ffmpeg(inputFilePath)
        .output(outputFilePath)
        .videoCodec('libx264')
        .size('640x360') // 解像度を変更
        .outputOptions('-crf 28') // 圧縮品質
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // 圧縮動画をSupabaseにアップロード
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`processed_videos/${outputFileName}`, fs.readFileSync(outputFilePath), {
        contentType: 'video/mp4',
      });

    if (error) throw error;

    // 一時ファイルの削除
    fs.unlinkSync(inputFilePath);
    fs.unlinkSync(outputFilePath);

    // 処理完了メッセージを返す
    res.json({ message: '動画の処理とアップロードが完了しました！' });
  } catch (err) {
    console.error(err);

    // エラー時のレスポンス
    res.status(500).json({ error: '動画の処理中にエラーが発生しました。' });
  }
});

// ✅ manifest.json への CORS 設定
app.get('/manifest.json', (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// ✅ サーバー起動
app.listen(3000, () => {
  console.log("🚀 サーバーが http://localhost:3000 で動作中");
});
