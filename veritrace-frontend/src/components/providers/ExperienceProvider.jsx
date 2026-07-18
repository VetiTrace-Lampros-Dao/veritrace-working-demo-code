import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { MotionConfig } from 'framer-motion'

const ThemeContext = createContext(null)

const getInitialTheme = () => {
  const saved = localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** Owns the global theme and the shared motion physics used by the product. */
export function ExperienceProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)
  const [integrityTone, setIntegrityTone] = useState('secure')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  const value = useMemo(() => ({
    theme,
    setTheme,
    integrityTone,
    setIntegrityTone,
    toggleTheme: () => setTheme(current => current === 'dark' ? 'light' : 'dark'),
  }), [theme, integrityTone])

  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 100, damping: 15 }}>
        {children}
      </MotionConfig>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ExperienceProvider')
  return context
}

export function useIntegrityTone() {
  const { integrityTone, setIntegrityTone } = useTheme()
  return { integrityTone, setIntegrityTone }
}
