import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// StrictMode double-invokes renders and effects in development, which is what
// surfaces accidental side effects (and the React Compiler benefits from it).
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
