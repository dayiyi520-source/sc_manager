import {computed, ref} from 'vue';
import {defineStore} from 'pinia';
import {clearSession, devLogin, readSession} from '../services/session';
export const useSessionStore = defineStore('session', () => {
  const session = ref(readSession());
  const user = computed(() => session.value?.user || null);
  async function login(username: string) { session.value = await devLogin(username); }
  function logout() { clearSession(); session.value = null; }
  return {session, user, login, logout};
});
