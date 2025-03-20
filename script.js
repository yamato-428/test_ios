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
    const chunkDuration = 10; // 10秒ごとに分割
  
    const outputFiles = [];
    
    for (let start = 0; start < duration; start += chunkDuration) {
      const chunkFileName = `chunk_${start}.mp4`;
  
      // 動画を分割して圧縮、解像度を変更
      await ffmpeg.run(
        '-i', inputFileName, 
        '-ss', start.toString(), 
        '-t', chunkDuration.toString(), 
        '-vcodec', 'libx264', 
        '-crf', '28', // 圧縮品質
        '-s', '426x140', // 解像度を変更（1280x720）
        chunkFileName
      );
      
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
  