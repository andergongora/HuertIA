import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import GardenPage from './pages/GardenPage'
import CropDetailPage from './pages/CropDetailPage'
import DashboardPage from './pages/DashboardPage'
import ChatPage from './pages/ChatPage'
import LoginPage from './pages/LoginPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Navigate to="/gardens" replace /></ProtectedRoute>} />
      <Route path="/gardens" element={<ProtectedRoute><GardenPage /></ProtectedRoute>} />
      <Route path="/gardens/:id" element={<ProtectedRoute><GardenPage /></ProtectedRoute>} />
      <Route path="/plantings/:id" element={<ProtectedRoute><CropDetailPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
