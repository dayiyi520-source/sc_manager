<script setup lang="ts">
defineProps<{label:string;modelValue:string;options:Array<{value:string;label:string}>;loading?:boolean;placeholder?:string}>();
defineEmits<{ 'update:modelValue':[value:string] }>();
</script>
<template><label>{{label}}<a-select :value="modelValue || undefined" :disabled="loading" :loading="loading" :placeholder="loading ? '正在加载…' : (placeholder || '请选择')" allow-clear @change="$emit('update:modelValue',String($event || ''))"><a-select-option v-for="option in options" :key="option.value" :value="option.value">{{option.label}}</a-select-option></a-select></label></template>
