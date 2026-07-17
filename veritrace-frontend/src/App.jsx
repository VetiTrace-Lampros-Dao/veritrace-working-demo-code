import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import RegisterPage from './pages/RegisterPage'
import VerifyPage from './pages/VerifyPage'
import LibraryPage from './pages/LibraryPage'
import AboutPage from './pages/AboutPage'

function App() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-200px)] pb-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}

export default App
