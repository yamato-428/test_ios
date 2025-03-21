// ファイル選択後の処理
document.getElementById("fileInput").addEventListener("change", async function (event) {
  const file = event.target.files[0]; // 選択されたファイルを取得

  if (!file) {
    alert("ファイルが選択されていません！");
    return;
  }

  if (!file.type.startsWith("video/")) {
    alert("動画ファイルを選択してください！");
    return;
  }

  // サーバーに動画をアップロード
  try {
    await uploadVideoToServer(file);
  } catch (error) {
    console.error("サーバーへのアップロード中にエラーが発生しました:", error);
    alert("動画のアップロードに失敗しました。");
  }
});

// 動画をサーバーにアップロード
async function uploadVideoToServer(file) {
  const formData = new FormData();
  formData.append("video", file);

  const response = await fetch("http://localhost:3000/process-video", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  // 成功・エラーメッセージを表示
  if (response.ok) {
    alert(result.message); // サーバーからの成功メッセージ
  } else {
    console.error("サーバーエラー:", result.error);
    alert(`エラー: ${result.error}`);
  }
}
