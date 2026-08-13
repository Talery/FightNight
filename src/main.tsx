import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './design-tests.css'
import './design-typography.css'
import './design-frames-v3.css'
import ConceptGallery from './concepts/ConceptGallery'

const showConcepts = new URLSearchParams(window.location.search).has('concepts')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showConcepts ? <ConceptGallery /> : <App />}
  </StrictMode>,
)
