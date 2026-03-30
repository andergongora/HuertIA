import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import GardenPage from './pages/GardenPage'
import CropDetailPage from './pages/CropDetailPage'
import DashboardPage from './pages/DashboardPage'
import ChatPage from './pages/ChatPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/gardens" replace />} />
        <Route path="/gardens" element={<GardenPage />} />
        <Route path="/gardens/:id" element={<GardenPage />} />
        <Route path="/plantings/:id" element={<CropDetailPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  )
}
