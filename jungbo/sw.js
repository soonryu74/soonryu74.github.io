/* 중보기도 나눔터 — 알림 받기용 서비스 워커. 화면 캐시는 하지 않는다(늘 최신 화면). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '중보기도 나눔터', {
    body: d.body || '',
    icon: 'assets/icon-192.png',
    badge: 'assets/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    requireInteraction: !!d.urgent,   // 긴급기도는 눌러서 닫을 때까지 남긴다
    vibrate: d.urgent ? [300, 100, 300, 100, 300] : [120],
    lang: 'ko',
    data: { url: d.url || 'index.html' }
  }));
});

// 알림을 누르면 열려 있는 창을 그 글로 옮기고, 없으면 새로 연다
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || 'index.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) {
        try { c.postMessage({ type: 'open-url', url: url }); } catch (err) {}
        return c.focus().catch(function () {});
      }
    }
    return self.clients.openWindow(url);
  }));
});
