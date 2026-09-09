<script setup lang="ts">defineProps<{count:number;placeholder:string}>(); const keyword=defineModel<string>({default:''});</script>
<template><div class="toolbar"><input v-model="keyword" :placeholder="placeholder"/><span>{{count}} 条记录</span></div></template>
