importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// We don't have access to env vars here directly without a bundler, 
// so we'll init with empty config, wait for the main thread to pass it, 
// OR we can rely on passing the config from the message.
// Actually, firebase-messaging-sw needs the config. Since it's a static file,
// the easiest robust way is to listen to a message from the client to init,
// OR pass URL params if registered dynamically. Let's use standard hardcoded or dynamic config.

let messaging;

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'INIT_FIREBASE') {
        if (!firebase.apps.length) {
            firebase.initializeApp(event.data.config);
            messaging = firebase.messaging();

            messaging.onBackgroundMessage((payload) => {
                console.log('[firebase-messaging-sw.js] Received background message ', payload);
                const notificationTitle = payload.notification?.title || 'New Message';
                const notificationOptions = {
                    body: payload.notification?.body,
                    icon: '/logo-square-180.jpg',
                    data: payload.data,
                    badge: '/logo.svg'
                };

                self.registration.showNotification(notificationTitle, notificationOptions);
            });
        }
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data;

    // Decide where to route based on notification data
    let targetUrl = '/';
    if (data && data.url) {
        targetUrl = data.url;
    } else if (data && data.type === 'message') {
        targetUrl = '/messages';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If window is already open, focus it and navigate
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
