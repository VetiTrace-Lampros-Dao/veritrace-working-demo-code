import { useTheme } from './providers/ExperienceProvider'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button 
      className={`theme-toggle-btn ${theme === 'dark' ? 'dark' : ''}`} 
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <div className="theme-toggle-track">
        {/* Starry details for dark mode background */}
        <span className="star star-1"></span>
        <span className="star star-2"></span>
        <span className="star star-3"></span>
        
        {/* Curvy clouds covering the bottom half of the track in light mode */}
        <div className="theme-toggle-clouds" aria-hidden="true">
          <svg viewBox="0 0 58 30" width="58" height="30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            <path 
              d="M0 20C4 16 9 15 12 17C15 13 21 11 25 15C29 11 36 9 41 13C46 11 51 14 53 18C55 17 57 18 58 20V30H0V20Z" 
              fill="#ffffff" 
              fillOpacity="0.95"
            />
            {/* Secondary puff for depth */}
            <path 
              d="M6 22C9 19 14 18 17 21C20 18 25 17 28 20V30H6V22Z" 
              fill="#c0e2f8" 
              fillOpacity="0.5"
            />
          </svg>
        </div>
      </div>
      <div className="theme-toggle-thumb">
        {/* The sun / moon shape inside thumb */}
        <div className="thumb-shape">
          {/* Sun rays container — fades/scales out in dark mode */}
          <div className="sun-rays">
            <span className="ray"></span>
            <span className="ray"></span>
            <span className="ray"></span>
            <span className="ray"></span>
            <span className="ray"></span>
            <span className="ray"></span>
            <span className="ray"></span>
            <span className="ray"></span>
          </div>
        </div>
      </div>
    </button>
  )
}
