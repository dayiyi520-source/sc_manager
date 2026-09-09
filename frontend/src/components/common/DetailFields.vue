<script setup lang="ts">
type DetailField={key:string;label:string};
defineProps<{record:Record<string,unknown>;fields:DetailField[]}>();
const display=(value:unknown)=>Array.isArray(value)?value.join('、'):String(value??'—');
</script>
<template><dl class="detail-list"><template v-for="field in fields" :key="field.key"><dt>{{field.label}}</dt><dd>{{display(record[field.key])}}</dd></template></dl></template>
