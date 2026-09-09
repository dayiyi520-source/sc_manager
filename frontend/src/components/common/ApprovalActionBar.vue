<script setup lang="ts">defineProps<{saving?:boolean}>();const emit=defineEmits<{approve:[];reject:[]}>();</script>
<template><div class="form-actions"><button class="primary" :disabled="saving" @click="emit('approve')">{{saving?'处理中…':'通过'}}</button><button class="secondary" :disabled="saving" @click="emit('reject')">驳回</button></div></template>
