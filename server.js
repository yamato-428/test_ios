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

// ✅ CORS 設定のさらなる拡張
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^(http:\/\/localhost:3000|https:\/\/.*\.github\.dev|https:\/\/.*\.github\.io|https:\/\/github\.dev)$/.test(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORSポリシーによりブロックされたオリジン: ${origin}`);
      callback(new Error('CORSポリシーによりブロックされました'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type",
}));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  console.log(`[DEBUG] リクエスト: ${req.method} ${req.url}`);
  next();
});

// ✅ 静的ファイルの提供 (CORSヘッダー追加)
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// ✅ Supabase の設定
const SUPABASE_URL = "https://gflvuocpcuiootlumzte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHZ1b2NwY3Vpb290bHVtenRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTk0NzMsImV4cCI6MjA1Nzk3NTQ3M30.Psyu6o5j_HbG1kJhqrnnhrnbznArH3JWAE_tJEKdPuA";
const BUCKET_NAME = "backups";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ ファイルアップロード設定
const upload = multer({ dest: 'uploads/' });

// ✅ ルートページを提供
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ 動画処理ルート
app.post('/process-video', upload.single('video'), async (req, res) => {
  const inputFilePath = req.file ? req.file.path : null;
  const outputFileName = `compressed_${Date.now()}.mp4`;
  const outputFilePath = `uploads/${outputFileName}`;

  if (!inputFilePath) {
    console.error('[ERROR] 動画がアップロードされていません');
    return res.status(400).json({ error: '動画がアップロードされていません。' });
  }

  try {
    console.log('[INFO] 動画処理を開始します...');
    await new Promise((resolve, reject) => {
      ffmpeg(inputFilePath)
        .output(outputFilePath)
        .videoCodec('libx264')
        .size('640x360')
        .outputOptions('-crf 28')
        .on('end', resolve)
        .on('error', (err) => {
          console.error('[ERROR] FFmpegエラー:', err);
          reject(err);
        })
        .run();
    });

    console.log('[INFO] Supabaseへのアップロードを開始します...');
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`processed_videos/${outputFileName}`, fs.readFileSync(outputFilePath), {
        contentType: 'video/mp4',
      });

    if (error) {
      console.error('[ERROR] Supabaseアップロードエラー:', error);
      throw error;
    }

    fs.unlinkSync(inputFilePath);
    fs.unlinkSync(outputFilePath);

    res.json({ message: '動画の処理とアップロードが正常に完了しました。' });
  } catch (err) {
    console.error('[ERROR] 処理中にエラーが発生:', err);
    res.status(500).json({ error: '動画の処理中にエラーが発生しました。' });
  }
});

// ✅ manifest.json への CORS 設定
app.get('/manifest.json', (req, res) => {
  const manifestPath = path.join(__dirname, 'public', 'manifest.json');
  console.log(`[DEBUG] manifest.jsonへのリクエスト: ${JSON.stringify(req.headers)}`);
  
  if (fs.existsSync(manifestPath)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/manifest+json");
    res.sendFile(manifestPath, (err) => {
      if (err) console.error(`[ERROR] manifest.json送信中にエラー: ${err.message}`);
    });
  } else {
    console.error('[ERROR] manifest.jsonが見つかりませんでした');
    res.status(404).json({ error: 'manifest.jsonが見つかりませんでした。' });
  }
});

// ✅ サーバー起動
app.listen(3000, () => {
  console.log("🚀 サーバーが http://localhost:3000 で動作中");
});
