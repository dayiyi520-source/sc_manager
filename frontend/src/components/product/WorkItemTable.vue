<script setup lang="ts">
import {computed} from 'vue';
const props=defineProps<{rows:Array<Record<string,unknown>>;columns:string[];keys:string[]}>();
const emit=defineEmits<{select:[row:Record<string,unknown>]}>();
const tableColumns=computed(()=>props.columns.map((title,index)=>({title,dataIndex:props.keys[index],key:props.keys[index]})));
const customRow=(record:Record<string,unknown>)=>({onClick:()=>emit('select',record)});
</script>
<template><div class="table-wrap"><a-table :data-source="rows" :columns="tableColumns" :custom-row="customRow" :pagination="false" row-key="id" size="middle"><template #bodyCell="{text}">{{String(text??'—')}}</template></a-table></div></template>
