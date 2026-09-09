<script setup lang="ts">
defineProps<{open:boolean; title:string}>();
const emit=defineEmits<{close:[]}>();
</script>
<template><Teleport to="body"><div v-if="open" class="drawer-backdrop" @click.self="emit('close')"><aside class="detail-drawer"><header><h3>{{title}}</h3><button type="button" aria-label="关闭" @click="emit('close')">×</button></header><div class="drawer-body"><slot /></div></aside></div></Teleport></template>
