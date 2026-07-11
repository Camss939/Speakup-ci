import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Topics from './pages/Topics';
import ModuleDetail from './pages/ModuleDetail';
import Coach from './pages/Coach';
import AdminDashboard from './pages/AdminDashboard';

const Spinner = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-muted)' }}>
    Chargement…
  </div>
);

function ProtectedRoute({ children, allowRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;

  if (!profile.approved && profile.role !== 'admin') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:'1rem', padding:'2rem', textAlign:'center' }}>
      <span style={{ fontSize:'3rem' }}>⏳</span>
      <h2 style={{ margin:0, color:'var(--text)', fontWeight:800 }}>Compte en attente</h2>
      <p style={{ color:'var(--text-muted)', maxWidth:'320px' }}>
        Ton compte est en cours de validation par l'administrateur. Tu recevras l'accès très bientôt !
      </p>
    </div>
  );
  if (allowRoles && !allowRoles.includes(profile.role)) return <Navigate to="/" replace />;

  return children;
}

function RootRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/admin" element={
            <ProtectedRoute allowRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute allowRoles={['learner', 'parent']}>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/topics" element={
            <ProtectedRoute allowRoles={['learner']}>
              <Topics />
            </ProtectedRoute>
          } />

          <Route path="/topics/:topicId" element={
            <ProtectedRoute allowRoles={['learner']}>
              <ModuleDetail />
            </ProtectedRoute>
          } />

          <Route path="/coach/:moduleId" element={
            <ProtectedRoute allowRoles={['learner']}>
              <Coach />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
