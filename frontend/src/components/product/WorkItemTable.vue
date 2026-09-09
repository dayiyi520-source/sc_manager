<script setup lang="ts">
defineProps<{rows:Array<Record<string,unknown>>;columns:string[];keys:string[]}>(); const emit=defineEmits<{select:[row:Record<string,unknown>]}>();
</script>
<template><div class="table-wrap"><table><thead><tr><th v-for="column in columns" :key="column">{{column}}</th></tr></thead><tbody><tr v-for="row in rows" :key="String(row.id)" @click="emit('select',row)"><td v-for="key in keys" :key="key">{{String(row[key]??'—')}}</td></tr></tbody></table></div></template>
