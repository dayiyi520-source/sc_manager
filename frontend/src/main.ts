import {createApp} from 'vue';
import {createPinia} from 'pinia';
import {VueQueryPlugin, QueryClient} from '@tanstack/vue-query';
import App from './App.vue';
import './style.css';
import {router} from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, {queryClient: new QueryClient()});
app.mount('#app');
