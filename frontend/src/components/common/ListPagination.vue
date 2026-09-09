<script setup lang="ts">
const props=defineProps<{page:number;pageSize:number;total:number}>(); const emit=defineEmits<{change:[page:number]}>(); const pages=()=>Math.max(1,Math.ceil(props.total/props.pageSize));
</script>
<template><div class="pagination"><span>共 {{total}} 条</span><button :disabled="page<=1" @click="emit('change',page-1)">上一页</button><span>{{page}} / {{pages()}}</span><button :disabled="page>=pages()" @click="emit('change',page+1)">下一页</button></div></template>
