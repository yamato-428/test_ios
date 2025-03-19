self.addEventListener('install', (event) => {
    console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activated.');
});

document.getElementById("fileInput").addEventListener("change", function (event) {
    const preview = document.getElementById("preview");
    preview.innerHTML = ""; // プレビューをリセット

    const files = event.target.files;
    if (!files.length) return;

    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const url = e.target.result;
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
        };
        reader.readAsDataURL(file);
    }
});
