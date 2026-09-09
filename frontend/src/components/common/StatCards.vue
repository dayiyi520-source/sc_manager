<script setup lang="ts">defineProps<{items:Array<{label:string;value:string;hint?:string}>}>();</script>
<template><div class="card-grid"><article v-for="item in items" :key="item.label" class="summary-card"><span>{{item.label}}</span><strong>{{item.value}}</strong><small>{{item.hint||'待接入数据'}}</small></article></div></template>
