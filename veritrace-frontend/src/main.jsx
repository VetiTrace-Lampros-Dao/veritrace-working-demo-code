/**
 * main.jsx — React application entry point
 * 
 * Wraps the App component in BrowserRouter for client-side routing
 * and StrictMode for development warnings.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { UploadProvider } from './context/UploadContext'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from './components/ui/tooltip'
import { config } from './wagmiConfig'
import { ExperienceProvider } from './components/providers/ExperienceProvider'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ExperienceProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <UploadProvider>
              <TooltipProvider delayDuration={200}>
                <App />
              </TooltipProvider>
            </UploadProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </WagmiProvider>
    </ExperienceProvider>
  </StrictMode>,
)
