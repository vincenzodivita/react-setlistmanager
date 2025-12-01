import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';

// Pages
import LoginPage from '@/pages/LoginPage';
import SongsPage from '@/pages/SongsPage';
import SetlistsPage from '@/pages/SetlistsPage';
import MetronomePage from '@/pages/MetronomePage';
import LivePage from '@/pages/LivePage';
import FriendsPage from '@/pages/FriendsPage';

// Components
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  const { isAuthenticated, loadUserData } = useAppStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated, loadUserData]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/songs" replace /> : <LoginPage />}
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
