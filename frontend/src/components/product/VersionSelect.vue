<script setup lang="ts">
import {computed} from 'vue';import {useQuery} from '@tanstack/vue-query';import {productRepository} from '../../services/productRepository';import RemoteSelect from './RemoteSelect.vue';
const props=defineProps<{modelValue:string;productLineId:string}>();defineEmits<{ 'update:modelValue':[value:string] }>();
const query=useQuery({queryKey:computed(()=>['product-versions',props.productLineId]),queryFn:()=>productRepository.productVersions(props.productLineId),enabled:computed(()=>Boolean(props.productLineId))});
const options=computed(()=>{const items=query.data.value||[];return items.map(item=>({value:String(item.id||''),label:String(item.name||item.code||item.version||item.id||'')})).filter(item=>item.value);});
</script>
<template><RemoteSelect label="版本" :model-value="modelValue" :options="options" :loading="query.isPending.value" :placeholder="productLineId ? (query.isError.value ? '版本加载失败' : '请选择版本') : '请先选择产品线'" @update:model-value="$emit('update:modelValue',$event)"/></template>
