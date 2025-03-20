// Supabaseの設定
const SUPABASE_URL = "https://gflvuocpcuiootlumzte.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const BUCKET_NAME = "backups";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: true,
    wasmOptions: {
        initial: 256,
        maximum: 512
    }
});

document.getElementById("fileInput").addEventListener("change", async function (event) {
    const preview = document.getElementById("preview");
    preview.innerHTML = "";

    const files = event.target.files;
    if (!files.length) return;

    const processedFiles = [];
    for (let file of files) {
        if (file.type.startsWith("image/")) {
            const compressedFile = await compressImage(file);
            processedFiles.push({ file: compressedFile, name: file.name });
        } else if (file.type.startsWith("video/")) {
            const compressedVideo = await compressVideo(file);
            processedFiles.push({ file: compressedVideo, name: file.name });
        } else {
            processedFiles.push({ file, name: file.name });
        }
    }

    // プレビュー表示
    for (let { file, name } of processedFiles) {
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
    const zipBlob = await createZip(processedFiles);

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
            quality: 0.6,
            maxWidth: 1024,
            maxHeight: 1024,
            success(result) {
                resolve(result);
            },
            error(err) {
                reject(err);
            }
        });
    });
}

// ZIPファイルを作成する関数
async function createZip(files) {
    const zip = new JSZip();
    for (let { file, name } of files) {
        zip.file(name, file);
    }
    return await zip.generateAsync({ type: "blob" });
}

// SupabaseにZIPファイルをアップロードする関数
async function uploadZipToSupabase(zipBlob) {
    const fileName = `backup_${new Date().toISOString()}.zip`;
    const filePath = `backups/${fileName}`;

    try {
        const { data, error } = await supabaseClient
            .storage
            .from(BUCKET_NAME)
            .upload(filePath, zipBlob, { contentType: 'application/zip' });

        if (error) throw error;

        alert(`アップロード成功！`);
    } catch (error) {
        console.error('アップロードエラー:', error);
        alert('アップロードに失敗しました');
    }
}

// 動画圧縮処理
async function compressVideo(file) {
    try {
        if (!ffmpeg.isLoaded()) {
            await ffmpeg.load();
        }
        const inputFileName = file.name;
        const outputFileName = 'compressed_' + inputFileName.replace(/\.[^/.]+$/, "") + '.mp4';

        ffmpeg.FS('writeFile', inputFileName, await fetchFile(file));

        await ffmpeg.run('-i', inputFileName, '-preset', 'ultrafast', '-b:v', '500k', outputFileName);

        const data = ffmpeg.FS('readFile', outputFileName);
        return new Blob([data.buffer], { type: 'video/mp4' });
    } catch (error) {
        console.error('動画圧縮エラー:', error);
        alert('動画の圧縮に失敗しました');
        return file; // 失敗した場合は元ファイルをそのまま返す
    }
}
