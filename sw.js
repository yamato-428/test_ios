// Service Worker のインストール
self.addEventListener('install', (event) => {
    console.log('Service Worker installing.');
    self.skipWaiting();
});

// Service Worker のアクティベート
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated.');
});
