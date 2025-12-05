import { useState, useEffect } from 'react';
import { pushNotifications } from '@/services/pushNotifications';
import './NotificationBanner.css';

export default function NotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Mostra il banner solo se le notifiche non sono ancora state richieste
    const permission = pushNotifications.getPermissionStatus();
    const dismissed = localStorage.getItem('notification_banner_dismissed');

    if (permission === 'default' && !dismissed) {
      // Attendi un po' prima di mostrare il banner
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      await pushNotifications.getAndRegisterToken();
      setShowBanner(false);
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('notification_banner_dismissed', 'true');
  };

  const handleLater = () => {
    setShowBanner(false);
    // Non salvare in localStorage, così il banner riapparirà alla prossima sessione
  };

  if (!showBanner) return null;

  return (
    <div className="notification-banner">
      <div className="notification-banner-content">
        <div className="notification-banner-icon">🔔</div>
        <div className="notification-banner-text">
          <strong>Attiva le notifiche</strong>
          <p>Ricevi avvisi per richieste di amicizia e condivisioni</p>
        </div>
        <div className="notification-banner-actions">
          <button 
            onClick={handleEnable} 
            className="btn btn-primary btn-sm"
            disabled={isRequesting}
          >
            {isRequesting ? 'Attivazione...' : 'Attiva'}
          </button>
          <button 
            onClick={handleLater}
            className="btn btn-secondary btn-sm"
          >
            Più tardi
          </button>
          <button 
            onClick={handleDismiss}
            className="notification-banner-close"
            title="Non mostrare più"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}