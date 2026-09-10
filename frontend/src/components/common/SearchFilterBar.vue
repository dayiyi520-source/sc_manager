<script setup lang="ts">defineProps<{placeholder:string;count:number}>();const keyword=defineModel<string>({default:''});</script>
<template><div class="filter-bar"><input v-model="keyword" :placeholder="placeholder"/><slot/><span class="record-count">{{count}} 条</span></div></template>
