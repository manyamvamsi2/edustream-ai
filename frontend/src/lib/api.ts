/**
 * Centralized API configuration for EduStream AI.
 * All backend API calls should use `api()` instead of hardcoded URLs.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Constructs a full API URL from a relative path.
 * @example api('/api/video/123') => 'https://your-backend.onrender.com/api/video/123'
 */
export const api = (path: string): string => `${API_BASE}${path}`;
