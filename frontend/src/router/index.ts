import {createRouter, createWebHistory} from 'vue-router';
import {useSessionStore} from '../stores/session';
import LoginView from '../views/LoginView.vue';
import WorkspaceView from '../views/WorkspaceView.vue';
export const router = createRouter({history: createWebHistory(), routes: [{path: '/', redirect: '/app/wb_my_tasks'}, {path: '/login', component: LoginView}, {path: '/app/:viewId?', component: WorkspaceView, meta: {requiresAuth: true}}]});
router.beforeEach((to) => { const store = useSessionStore(); if (to.meta.requiresAuth && !store.user) return '/login'; if (to.path === '/login' && store.user) return '/app/wb_my_tasks'; });
