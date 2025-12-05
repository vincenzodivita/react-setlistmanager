import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { pushNotifications } from '@/services/pushNotifications';

// Pages
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import SongsPage from '@/pages/SongsPage';
import SetlistsPage from '@/pages/SetlistsPage';
import MetronomePage from '@/pages/MetronomePage';
import LivePage from '@/pages/LivePage';
import FriendsPage from '@/pages/FriendsPage';

// Components
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import NotificationBanner from '@/components/NotificationBanner';

function App() {
  const { isAuthenticated, loadUserData, user } = useAppStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated, loadUserData]);

  // Inizializza le push notifications quando l'utente è autenticato
  useEffect(() => {
    if (isAuthenticated && user) {
      initPushNotifications();
    }
  }, [isAuthenticated, user]);

  const initPushNotifications = async () => {
    try {
      const initialized = await pushNotifications.init();
      if (initialized) {
        // Richiedi permesso e registra il token
        await pushNotifications.getAndRegisterToken();

        // Ascolta i messaggi in foreground
        pushNotifications.onForegroundMessage((payload) => {
          console.log('Notification received:', payload);
          // Il servizio mostra già la notifica browser
        });
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  return (
    <BrowserRouter>
      {/* Banner per richiedere permesso notifiche */}
      {isAuthenticated && <NotificationBanner />}

      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/songs" replace /> : <LoginPage />}
        />
        <Route
          path="/forgot-password"
          element={isAuthenticated ? <Navigate to="/songs" replace /> : <ForgotPasswordPage />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />
        <Route
          path="/verify-email"
          element={<VerifyEmailPage />}
        />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/songs" replace />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/setlists" element={<SetlistsPage />} />
            <Route path="/metronome" element={<MetronomePage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/friends" element={<FriendsPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;