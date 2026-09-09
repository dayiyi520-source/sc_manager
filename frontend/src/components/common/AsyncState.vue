<script setup lang="ts">defineProps<{pending:boolean;error:boolean;empty:boolean;loadingText:string;errorText:string;emptyText:string}>();</script>
<template><div v-if="pending" class="state">{{loadingText}}</div><div v-else-if="error" class="state error">{{errorText}}</div><div v-else-if="empty" class="state">{{emptyText}}</div><slot v-else /></template>
