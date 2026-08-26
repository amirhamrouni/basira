import React from 'react'
import ReactDOM from 'react-dom/client'

// Clean Firebase OAuth redirect query parameters from the URL before initializing Firebase.
// This prevents the SDK from automatically trying to read partitioned sessionStorage on startup.
if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.has('apiKey') || url.searchParams.has('authMode') || url.hash.includes('__firebase_request_key') || url.search.includes('__firebase_request_key')) {
        url.search = '';
        url.hash = '';
        window.history.replaceState({}, document.title, url.toString());
    }
}

import App from './App.tsx'
import './index.css'
import { AuthProvider } from './components/AuthProvider'


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
