import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import MobileApp from './MobileApp.tsx'

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMobile ? <MobileApp /> : <App />}
  </StrictMode>,
)
