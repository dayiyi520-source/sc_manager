<script setup lang="ts">
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import {useSessionStore} from '../stores/session';
const router = useRouter(); const store = useSessionStore(); const username = ref('admin'); const loading = ref(false); const error = ref('');
async function submit() { loading.value = true; error.value = ''; try { await store.login(username.value); await router.replace('/app/wb_my_tasks'); } catch (reason) { error.value = reason instanceof Error ? reason.message : '登录失败'; } finally { loading.value = false; } }
</script>
<template><main class="login-page"><section class="login-card"><span class="eyebrow">SC DIGITAL WORKSPACE</span><h1>欢迎回来</h1><p>登录以继续你的工作空间</p><form @submit.prevent="submit"><label>开发账号<select v-model="username"><option value="admin">admin · 林志豪</option><option value="sales">sales · 陈雅婷</option><option value="product">product · 张瑞</option><option value="tech">tech · 王浩然</option></select></label><button :disabled="loading">{{ loading ? '正在进入…' : '进入工作空间' }}</button><small v-if="error" class="error">{{ error }}</small></form></section></main></template>
