self.addEventListener('push', function(event) {
  const text = event.data ? event.data.text() : 'رسالة من النجوم 🌟';
  
  const options = {
    body: text,
  };

  event.waitUntil(
    self.registration.showNotification('بصيرة بابل 🌟', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
