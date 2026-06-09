/* ===== Service Worker - 工资计算器 ===== */

const CACHE_NAME = 'salary-calc-v2';
const ASSETS_TO_CACHE = [
  '.',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
];

/* ===== Install: 预缓存核心资源 ===== */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 正在缓存资源...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        // 个别资源失败不阻塞安装
        console.warn('部分资源缓存失败:', err);
      });
    }).then(() => {
      // 强制激活，不等待旧 SW 释放
      return self.skipWaiting();
    })
  );
});

/* ===== Activate: 清理旧缓存 ===== */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('🗑️ 删除旧缓存:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // 立即接管所有页面
      return self.clients.claim();
    })
  );
});

/* ===== Fetch: 缓存优先策略 ===== */
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 命中缓存：返回缓存，同时在后台更新
      if (cachedResponse) {
        // 后台发起网络请求更新缓存
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {
          // 网络更新失败，忽略
        });

        return cachedResponse;
      }

      // 未命中缓存：走网络
      return fetch(event.request).then((networkResponse) => {
        // 缓存成功的响应
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 网络失败且无缓存：返回离线页面
        // 对于 HTML 请求返回离线提示
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return new Response(
            `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>离线</title><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:linear-gradient(160deg,#FFE4E8,#E4F0F8);color:#4A4A4A;text-align:center} h1{font-size:3rem} p{margin-top:8px;opacity:0.7}</style></head><body><div><h1>📡</h1><p>当前离线，请连接网络后重试</p></div></body></html>`,
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          );
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
