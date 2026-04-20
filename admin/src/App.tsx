import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminRoute, ProtectedRoute } from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import BoardingModeration from "./pages/BoardingModeration";
import MarketplaceModeration from "./pages/MarketplaceModeration";
import Payments from "./pages/Payments";
import Reservations from "./pages/Reservations";
import VisitRequests from "./pages/VisitRequests";
import Reviews from "./pages/Reviews";
import AuditLogs from "./pages/AuditLogs";
import ManageBoardings from "./pages/ManageBoardings";
import ManageMarketplace from "./pages/ManageMarketplace";
import Users from "./pages/Users";
import AdminProfile from "./pages/AdminProfile";
import Login from "./pages/Login";
import Forbidden from "./pages/Forbidden";
import { AuthProvider } from "./auth/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/admin">
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
            <Route
              path="marketplace-moderation"
              element={<MarketplaceModeration />}
            />
            <Route path="users" element={<Users />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="visit-requests" element={<VisitRequests />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="manage-boardings" element={<ManageBoardings />} />
            <Route path="manage-marketplace" element={<ManageMarketplace />} />
            <Route path="admin-profile" element={<AdminProfile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
