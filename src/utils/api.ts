// src/utils/api.ts

// Retrieve production backend API URL from Vite environment variables (if set)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function getApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Detect if running inside a native mobile webview (Capacitor)
    const isCapacitor = (window as any).Capacitor !== undefined || window.hasOwnProperty('Capacitor');
    
    if (isCapacitor) {
        // If a custom API URL is set in env, use it, otherwise default to Android Emulator localhost mapping
        return `${API_BASE_URL || 'http://10.0.2.2:3000'}${cleanEndpoint}`;
    }
    
    // For standard web browsers, relative URLs work perfectly with the proxy/Vite server
    return `${API_BASE_URL}${cleanEndpoint}`;
}
