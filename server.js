// server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const upload = multer({ dest: 'uploads/' });

// Supabaseのクライアント設定
const SUPABASE_URL = "https://gflvuocpcuiootlumzte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHZ1b2NwY3Vpb290bHVtenRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTk0NzMsImV4cCI6MjA1Nzk3NTQ3M30.Psyu6o5j_HbG1kJhqrnnhrnbznArH3JWAE_tJEKdPuA"; // あなたのAPIキー
const BUCKET_NAME = "backups"; // バケット名
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 動画圧縮と分割の設定
const compressAndSplitVideo = (inputPath, outputPath, callback) => {
  ffmpeg(inputPath)
    .output(outputPath)
    .withAudioCodec('aac')
    .withVideoCodec('libx264')
    .on('end', callback)
    .run();
};

// ファイルアップロードと処理
app.post('/upload', upload.array('files', 10), (req, res) => {
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).send('No files uploaded.');
  }

  // ファイルを順に処理
  files.forEach(file => {
    const filePath = path.join(__dirname, 'uploads', file.filename);

    if (file.mimetype.startsWith('video/')) {
      // 動画ファイルの場合は圧縮と分割を実行
      const outputFilePath = path.join(__dirname, 'uploads', `compressed_${file.filename}`);
      compressAndSplitVideo(filePath, outputFilePath, () => {
        // 圧縮後、Supabaseにアップロード
        uploadFileToSupabase(outputFilePath)
          .then(() => {
            res.status(200).send('File uploaded and processed successfully');
          })
          .catch(err => {
            console.error(err);
            res.status(500).send('Error uploading file to Supabase');
          });
      });
    }
  });
});

// Supabaseにファイルをアップロードする関数
const uploadFileToSupabase = async (filePath) => {
  const fileName = path.basename(filePath);
  const { data, error } = await supabase
    .storage
    .from(BUCKET_NAME)
    .upload(fileName, fs.createReadStream(filePath), {
      contentType: 'application/octet-stream'
    });

  if (error) throw error;

  fs.unlinkSync(filePath); // アップロード後、ローカルのファイルを削除
  return data;
};

// サーバーの起動
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
