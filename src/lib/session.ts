import { clearAuthState } from './authStorage';
import { showErrorToast } from './toast';

export const handleUnauthorized = (message = 'Your session has expired. Please log in again.') => {
  showErrorToast('Session expired', message);
  clearAuthState();
  window.location.replace('/login');
};
