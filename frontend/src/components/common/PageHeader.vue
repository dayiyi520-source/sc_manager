<script setup lang="ts">defineProps<{eyebrow:string;title:string;description?:string}>();</script>
<template><header class="page-header"><div><span class="eyebrow">{{eyebrow}}</span><h2>{{title}}</h2><p v-if="description">{{description}}</p></div><div class="page-actions"><slot name="actions"/></div></header></template>
