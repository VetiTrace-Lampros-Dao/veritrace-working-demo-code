import Navbar from './Navbar'
import Footer from './Footer'
import AmbientBackground from './AmbientBackground'

/** Shared layout boundary for every route. */
export default function AppShell({ children }) {
  return (
    <>
      <AmbientBackground />
      <Navbar />
      <main className="site-content min-h-[calc(100vh-200px)] pb-8">{children}</main>
      <Footer />
    </>
  )
}
