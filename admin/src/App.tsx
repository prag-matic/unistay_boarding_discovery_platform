import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminRoute, ProtectedRoute } from './auth/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import BoardingModeration from './pages/BoardingModeration';
import Users from './pages/Users';
import Login from './pages/Login';
import Forbidden from './pages/Forbidden';
import { AuthProvider } from './auth/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/forbidden"
            element={
              <ProtectedRoute>
                <Forbidden />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <AdminRoute>
                <Layout />
              </AdminRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="moderation" element={<BoardingModeration />} />
            <Route path="users" element={<Users />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
