import api from './api';

export async function connectGoogleProfile(returnTo) {
  const { data } = await api.get('/auth/google/link/redirect');
  const state = new URL(data.url).searchParams.get('state');
  sessionStorage.setItem('googleProfileLink', JSON.stringify({ state, returnTo }));
  window.location.assign(data.url);
}
