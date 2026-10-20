// Service worker for push-varsler. Viser varselet, og åpner riktig side når man trykker på det.
self.addEventListener("push", (event) => {
  let m = { tittel: "Tidsklemma", tekst: "", url: "/" };
  try {
    m = { ...m, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(m.tittel, {
      body: m.tekst,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: m.merke,
      data: { url: m.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((vinduer) => {
      const apent = vinduer.find((v) => v.url.startsWith(self.location.origin));
      if (apent) return apent.navigate(url).then((v) => (v ?? apent).focus());
      return self.clients.openWindow(url);
    }),
  );
});
