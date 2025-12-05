// Firebase Messaging Service Worker
// Questo file deve essere nella root della cartella public/

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Configurazione Firebase (deve corrispondere a quella dell'app)
// Questi valori vengono iniettati durante il build o puoi configurarli manualmente
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || '',
  authDomain: self.FIREBASE_AUTH_DOMAIN || '',
  projectId: self.FIREBASE_PROJECT_ID || '',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.FIREBASE_APP_ID || '',
};

// Inizializza Firebase solo se configurato
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  // Gestisci i messaggi in background
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'Setlist Manager';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: payload.notification?.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'setlist-manager-notification',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: payload.data,
      actions: [
        {
          action: 'open',
          title: 'Apri',
        },
        {
          action: 'close',
          title: 'Chiudi',
        },
      ],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Gestisci il click sulla notifica
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'close') {
    return;
  }

  // Determina l'URL da aprire in base al tipo di notifica
  let urlToOpen = '/';

  if (data?.type === 'friend_request' || data?.type === 'friend_accepted') {
    urlToOpen = '/friends';
  } else if (data?.type === 'shared_song') {
    urlToOpen = '/songs';
  } else if (data?.type === 'shared_setlist') {
    urlToOpen = '/setlists';
  }

  // Apri o focalizza la finestra dell'app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Cerca se c'è già una finestra dell'app aperta
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }

      // Se non c'è, apri una nuova finestra
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Gestisci la chiusura della notifica
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

console.log('[SW] Firebase messaging service worker loaded');