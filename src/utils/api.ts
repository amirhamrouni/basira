// src/utils/api.ts

// Retrieve production backend API URL from Vite environment variables (if set)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Production backend URL for mobile (Capacitor) builds
const PRODUCTION_API_URL = 'https://basira-preview.amiris001.chatgpt.site';

export function getApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Detect if running inside a native mobile webview (Capacitor)
    const isCapacitor = (window as any).Capacitor !== undefined || window.hasOwnProperty('Capacitor');
    
    if (isCapacitor) {
        // In production mobile builds, use the deployed backend URL
        return `${API_BASE_URL || PRODUCTION_API_URL}${cleanEndpoint}`;
    }
    
    // For standard web browsers, relative URLs work perfectly with the proxy/Vite server
    return `${API_BASE_URL}${cleanEndpoint}`;
}
