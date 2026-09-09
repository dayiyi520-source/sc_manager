<script setup lang="ts">
defineProps<{label:string;modelValue:string;options:Array<{value:string;label:string}>;loading?:boolean;placeholder?:string}>();
defineEmits<{ 'update:modelValue':[value:string] }>();
</script>
<template><label>{{label}}<select :value="modelValue" :disabled="loading" @change="$emit('update:modelValue',($event.target as HTMLSelectElement).value)"><option value="">{{loading ? '正在加载…' : (placeholder || '请选择')}}</option><option v-for="option in options" :key="option.value" :value="option.value">{{option.label}}</option></select></label></template>
