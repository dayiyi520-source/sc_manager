<script setup lang="ts">defineProps<{status:unknown}>();</script>
<template><span class="tag">{{String(status||'未设置')}}</span></template>
