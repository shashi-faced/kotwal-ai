import { tokenStore } from './tokenStore';
import { clearCachedUser } from './authStorage';
import { showErrorToast } from './toast';

/**
 * Called when a request was definitively rejected as unauthenticated, even
 * after the refresh attempt. Clears in-memory token + cached user, then
 * sends the user back to /login.
 */
export const handleUnauthorized = (
  message = 'Your session has expired. Please log in again.',
) => {
  tokenStore.clear();
  clearCachedUser();
  showErrorToast('Session expired', message);
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};
