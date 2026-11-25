/* 말씀 알림 — 알림 받기용 서비스 워커. 화면 캐시는 하지 않는다(늘 최신 화면). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  // tag 를 하나로 두어, 새 알림이 오면 앞의 것을 갈아 끼운다 (알림이 쌓이지 않는다)
  e.waitUntil(self.registration.showNotification(d.title || '말씀 알림', {
    body: d.body || '',
    icon: 'assets/icon-192.png',
    badge: 'assets/badge-96.png',
    tag: 'malsseum',
    renotify: true,
    vibrate: [80],
    lang: 'ko',
    data: { url: 'index.html' + (d.id ? '#i=' + d.id : '') }
  }));
});

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
