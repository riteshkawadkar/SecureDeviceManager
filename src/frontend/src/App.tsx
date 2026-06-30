import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/Auth/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import DevicesPage from './pages/Devices/DevicesPage';
import DeviceDetailPage from './pages/DeviceDetail/DeviceDetailPage';
import PoliciesPage from './pages/Policies/PoliciesPage';
import PolicyDetailPage from './pages/Policies/PolicyDetailPage';
import RemoteActionsPage from './pages/RemoteActions/RemoteActionsPage';
import BulkPolicyPage from './pages/Policies/BulkPolicyPage';
import AppManagementPage from './pages/AppManagement/AppManagementPage';
import ReportsPage from './pages/Reports/ReportsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import SupportPage from './pages/Support/SupportPage';
import EnrollDevicePage from './pages/Enroll/EnrollDevicePage';
import UsersPage from './pages/Users/UsersPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole('SuperAdmin', 'Admin')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="devices/enroll" element={<EnrollDevicePage />} />
          <Route path="devices/:id" element={<DeviceDetailPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="policies/:id" element={<PolicyDetailPage />} />
          <Route path="remote-actions" element={<RemoteActionsPage />} />
          <Route path="bulk-policies" element={<BulkPolicyPage />} />
          <Route path="app-management" element={<AppManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="support" element={<SupportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
