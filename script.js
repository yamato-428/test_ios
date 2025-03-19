
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

        // 画像圧縮処理とプレビュー表示
        const compressedFiles = [];
        for (let file of files) {
            if (file.type.startsWith("image/")) {
                // 画像ファイルを圧縮
                const compressedFile = await compressImage(file);
                compressedFiles.push(compressedFile);
            } else {
                compressedFiles.push(file); // 画像以外のファイルはそのまま
            }
        }

        // プレビュー表示
        for (let file of compressedFiles) {
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
        const zipBlob = await createZip(compressedFiles);

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

    // ZIPファイルを作成する関数
    async function createZip(files) {
        const zip = new JSZip();
        for (let file of files) {
            zip.file(file.name, file);
        }
        return await zip.generateAsync({ type: "blob" });
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
