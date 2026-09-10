import {createApp} from 'vue';
import {createPinia} from 'pinia';
import {VueQueryPlugin, QueryClient} from '@tanstack/vue-query';
import App from './App.vue';
import './theme.css';  // 统一主题样式
import './style.css';  // 布局样式
import {router} from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, {queryClient: new QueryClient()});
app.mount('#app');
