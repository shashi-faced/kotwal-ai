import { clearAuthState } from './authStorage';

export const handleUnauthorized = () => {
  clearAuthState();
  window.location.replace('/login');
};
