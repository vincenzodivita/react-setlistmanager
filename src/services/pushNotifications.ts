import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { apiClient } from './api';

// Firebase configuration - da configurare con le proprie credenziali
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

class PushNotificationsService {
  private messaging: Messaging | null = null;
  private isSupported: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): void {
    this.isSupported = 
      'Notification' in window && 
      'serviceWorker' in navigator &&
      'PushManager' in window;
  }

  async init(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    // Verifica che le credenziali Firebase siano configurate
    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
      console.warn('Firebase not configured - push notifications disabled');
      return false;
    }

    try {
      // Inizializza Firebase se non già inizializzato
      const app = getApps().length === 0 
        ? initializeApp(FIREBASE_CONFIG) 
        : getApps()[0];

      this.messaging = getMessaging(app);
      this.isInitialized = true;

      // Registra il service worker
      await this.registerServiceWorker();

      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported) {
      return 'denied';
    }
    return Notification.permission;
  }

  async getAndRegisterToken(): Promise<string | null> {
    if (!this.messaging) {
      const initialized = await this.init();
      if (!initialized) return null;
    }

    // Verifica il permesso
    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Notification permission not granted');
        return null;
      }
    }

    try {
      // Ottieni il service worker registration
      const swRegistration = await navigator.serviceWorker.ready;

      // Ottieni il token FCM
      const token = await getToken(this.messaging!, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      });

      if (token) {
        console.log('FCM Token obtained:', token.substring(0, 20) + '...');
        
        // Registra il token sul backend
        await this.registerTokenOnBackend(token);
        
        return token;
      } else {
        console.warn('No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  private async registerTokenOnBackend(token: string): Promise<void> {
    try {
      const deviceInfo = this.getDeviceInfo();
      await apiClient.registerDevice(token, deviceInfo, 'web');
      console.log('Device registered on backend');
    } catch (error) {
      console.error('Error registering device on backend:', error);
    }
  }

  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    const browserInfo = {
      userAgent: ua,
      platform: navigator.platform,
      language: navigator.language,
    };
    return JSON.stringify(browserInfo);
  }

  onForegroundMessage(callback: (payload: NotificationPayload) => void): () => void {
    if (!this.messaging) {
      console.warn('Messaging not initialized');
      return () => {};
    }

    const unsubscribe = onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);

      const notification: NotificationPayload = {
        title: payload.notification?.title || 'Nuova notifica',
        body: payload.notification?.body || '',
        icon: payload.notification?.icon,
        data: payload.data as Record<string, string>,
      };

      callback(notification);

      // Mostra anche una notifica browser se l'app è in foreground
      this.showLocalNotification(notification);
    });

    return unsubscribe;
  }

  private showLocalNotification(payload: NotificationPayload): void {
    if (Notification.permission === 'granted') {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'setlist-manager',
        requireInteraction: true,
      });
    }
  }

  async unregisterToken(): Promise<void> {
    const storedToken = localStorage.getItem('fcm_token');
    if (storedToken) {
      try {
        await apiClient.unregisterDevice(storedToken);
        localStorage.removeItem('fcm_token');
        console.log('Device unregistered');
      } catch (error) {
        console.error('Error unregistering device:', error);
      }
    }
  }
}

export const pushNotifications = new PushNotificationsService();