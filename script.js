// Supabaseの設定
const SUPABASE_URL = "https://gflvuocpcuiootlumzte.supabase.co"; // あなたのSupabase URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHZ1b2NwY3Vpb290bHVtenRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzOTk0NzMsImV4cCI6MjA1Nzk3NTQ3M30.Psyu6o5j_HbG1kJhqrnnhrnbznArH3JWAE_tJEKdPuA"; // あなたのAPIキー
const BUCKET_NAME = "backups"; // バケット名
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ファイル選択後の処理
document.getElementById("fileInput").addEventListener("change", async function (event) {
  const preview = document.getElementById("preview");
  preview.innerHTML = ""; // プレビューをリセット

  const files = event.target.files;
  if (!files.length) return;

  // 進捗表示要素
  const progressBar = document.createElement('progress');
  progressBar.max = 100;
  progressBar.value = 0;
  preview.appendChild(progressBar);

  // 画像・動画の圧縮処理とプレビュー表示
  const processedFiles = [];
  for (let file of files) {
    if (file.type.startsWith("image/")) {
      // 画像ファイルを圧縮
      const compressedFile = await compressImage(file);
      processedFiles.push(compressedFile);
    } else if (file.type.startsWith("video/")) {
      // 動画ファイルを分割・圧縮
      const compressedVideo = await compressAndSplitVideo(file, progressBar);
      processedFiles.push(compressedVideo);
    } else {
      processedFiles.push(file); // 画像・動画以外はそのまま
    }
  }

  // プレビュー表示
  for (let file of processedFiles) {
    const url = URL.createObjectURL(file);
    let element;

    if (file.type.startsWith("image/")) {
      element = document.createElement("img");
      element.src = url;
      element.style.width = "100px";
      element.style.margin = "5px";
    } else if (file.type.startsWith("video/")) {
      element = document.createElement("video");
      element.src = url;
      element.controls = true;
      element.style.width = "150px";
      element.style.margin = "5px";
    }

    preview.appendChild(element);
  }

  // ZIP圧縮処理
  const zipBlob = await createZip(processedFiles, progressBar);

  // ZIPをダウンロードリンクとして表示
  const zipUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = zipUrl;
  a.download = "files.zip";
  a.textContent = "ZIPをダウンロード";
  a.style.display = "block";
  a.style.marginTop = "10px";
  preview.appendChild(a);

  // ZIPファイルをSupabaseにアップロード
  await uploadZipToSupabase(zipBlob);
});

// 画像圧縮処理
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.6, // 圧縮の品質（0～1）
      maxWidth: 1024, // 最大幅
      maxHeight: 1024, // 最大高さ
      success(result) {
        resolve(result);
      },
      error(err) {
        reject(err);
      }
    });
  });
}

// ZIPファイルを作成する関数（進捗表示対応）
async function createZip(files, progressBar) {
  const zip = new JSZip();
  let totalFiles = files.length;
  let processedFiles = 0;

  // ファイルをZIPに追加
  files.forEach((file, index) => {
    zip.file(file.name, file);
  });

  // 進捗表示
  const zipBlob = await zip.generateAsync({
    type: "blob",
    progress: function (progress) {
      // 進捗更新
      progressBar.value = progress.percent; // 圧縮進捗を反映
    }
  });

  return zipBlob;
}

// SupabaseにZIPファイルをアップロードする関数
async function uploadZipToSupabase(zipBlob) {
  const fileName = `backup_${new Date().toISOString()}.zip`; // ファイル名に現在時刻をつけて一意に
  const filePath = `backups/${fileName}`; // 'backups' バケットにアップロード

  try {
    // Supabaseのストレージにファイルをアップロード
    const { data, error } = await supabaseClient
      .storage
      .from(BUCKET_NAME) // 'backups' バケットにアップロード
      .upload(filePath, zipBlob, {
        contentType: 'application/zip'
      });

    if (error) throw error;

    alert(`アップロード成功！`);
  } catch (error) {
    console.error('アップロードエラー:', error);
    alert('アップロードに失敗しました');
  }
}

// FFmpeg.wasmによる動画圧縮と分割
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true, MEM_SIZE: 512 * 1024 * 1024 }); // メモリサイズを512MBに設定

async function compressAndSplitVideo(file, progressBar) {
  // ffmpeg のロード（初回のみ）
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const inputFileName = file.name;
  const outputFileName = 'compressed_' + inputFileName.split('.').slice(0, -1).join('.') + '.mp4';
  
  // 入力ファイルをffmpegの仮想ファイルシステムに書き込む
  ffmpeg.FS('writeFile', inputFileName, await fetchFile(file));

  // 動画の長さ（秒）を取得
  const duration = await getVideoDuration(inputFileName);
  const chunkDuration = 30; // 30秒ごとに分割

  const outputFiles = [];
  
  for (let start = 0; start < duration; start += chunkDuration) {
    const chunkFileName = `chunk_${start}.mp4`;

    // 動画を分割して圧縮
    await ffmpeg.run('-i', inputFileName, '-ss', start.toString(), '-t', chunkDuration.toString(), '-vcodec', 'libx264', '-crf', '28', chunkFileName);
    
    // 分割されたファイルを読み込み
    const data = ffmpeg.FS('readFile', chunkFileName);
    
    // Blobに変換して保存
    outputFiles.push(new Blob([data.buffer], { type: 'video/mp4' }));

    // 作業が完了した後に分割されたファイルを削除してメモリを解放
    ffmpeg.FS('unlink', chunkFileName);
  }

  // メモリ解放
  ffmpeg.FS('unlink', inputFileName);

  return outputFiles;
}

// 動画の長さを取得するヘルパー関数
async function getVideoDuration(fileName) {
  await ffmpeg.run('-i', fileName);
  const logs = ffmpeg.stdout;
  const durationMatch = logs.find(line => line.includes('Duration'));
  const durationString = durationMatch ? durationMatch.split(' ')[1] : '00:00:00';
  const [hours, minutes, seconds] = durationString.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}
