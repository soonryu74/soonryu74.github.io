/* 목장 나눔터 — 알림 받기용 서비스 워커. 화면 캐시는 하지 않는다(늘 최신 화면). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '목장 나눔터', {
    body: d.body || '',
    icon: d.icon || 'assets/icon-192.png',   // 보낸 사람 사진 (없으면 앱 아이콘)
    badge: 'assets/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    lang: 'ko',
    data: { url: d.url || 'moksa.html' }
  }));
});

// 알림을 누르면 열려 있는 창을 그 일기로 옮기고, 없으면 새로 연다
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || 'moksa.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(self.registration.scope) === 0 && 'focus' in c) {
        return c.focus().then(function (w) { return w.navigate ? w.navigate(url) : null; });
      }
    }
    return self.clients.openWindow(url);
  }));
});
