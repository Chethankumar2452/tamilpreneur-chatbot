// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ConversationsPage from './pages/ConversationsPage';
import ConversationDetailPage from './pages/ConversationDetailPage';
import LeadsPage from './pages/LeadsPage';
import CallsPage from './pages/CallsPage';
import RecordingsPage from './pages/RecordingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import SettingsPage from './pages/SettingsPage';
import AdminUsersPage from './pages/AdminUsersPage';

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="conversations/:sessionId" element={<ConversationDetailPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="recordings" element={<RecordingsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="knowledge" element={<KnowledgeBasePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
