<script setup lang="ts">defineProps<{tabs:Array<{key:string;label:string}>;active:string}>();const emit=defineEmits<{change:[key:string]}>();</script>
<template><div class="tabs entity-tabs"><button v-for="tab in tabs" :key="tab.key" :class="{active:active===tab.key}" @click="emit('change',tab.key)">{{tab.label}}</button></div></template>
