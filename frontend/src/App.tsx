import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUser, SignIn } from '@stackframe/stack'
import GardenPage from './pages/GardenPage'
import CropDetailPage from './pages/CropDetailPage'
import DashboardPage from './pages/DashboardPage'
import ChatPage from './pages/ChatPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useUser()
  if (user === null) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<SignIn />} />
        <Route path="/" element={<ProtectedRoute><Navigate to="/gardens" replace /></ProtectedRoute>} />
        <Route path="/gardens" element={<ProtectedRoute><GardenPage /></ProtectedRoute>} />
        <Route path="/gardens/:id" element={<ProtectedRoute><GardenPage /></ProtectedRoute>} />
        <Route path="/plantings/:id" element={<ProtectedRoute><CropDetailPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
