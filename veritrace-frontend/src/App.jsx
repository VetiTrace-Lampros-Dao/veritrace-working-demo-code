import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import HomePage from './pages/HomePage'
import RegisterPage from './pages/RegisterPage'
import VerifyPage from './pages/VerifyPage'
import LibraryPage from './pages/LibraryPage'
import AboutPage from './pages/AboutPage'
import ProfilePage from './pages/ProfilePage'
import EnterprisePage from './pages/EnterprisePage'
import AdminPage from './pages/AdminPage'
import { Toaster } from './components/ui/sonner'
import AppShell from './components/AppShell'
import ChatWidget from './components/ChatWidget'

// Page wrapper for transitions
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.45 }}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}

function App() {
  const location = useLocation()
  
  return (
    <>
      <AppShell>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
            <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />
            <Route path="/verify" element={<PageWrapper><VerifyPage /></PageWrapper>} />
            <Route path="/library" element={<PageWrapper><LibraryPage /></PageWrapper>} />
            <Route path="/about" element={<PageWrapper><AboutPage /></PageWrapper>} />
            <Route path="/profile" element={<PageWrapper><ProfilePage /></PageWrapper>} />
            <Route path="/enterprise" element={<PageWrapper><EnterprisePage /></PageWrapper>} />
            <Route path="/admin/owner" element={<PageWrapper><AdminPage /></PageWrapper>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </AppShell>
      <ChatWidget />
      <Toaster />
    </>
  )
}

export default App
