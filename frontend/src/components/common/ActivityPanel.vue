<script setup lang="ts">
import {ref, watch} from 'vue';
const props=defineProps<{entityId:string;loadEvents:(id:string)=>Promise<Array<Record<string,unknown>>>;submitComment:(id:string,content:string)=>Promise<unknown>}>();
const events=ref<Array<Record<string,unknown>>>([]); const comment=ref(''); const loading=ref(false); const saving=ref(false); const error=ref('');
const load=async()=>{if(!props.entityId)return;loading.value=true;error.value='';try{events.value=await props.loadEvents(props.entityId)}catch(e){error.value=e instanceof Error?e.message:'动态加载失败'}finally{loading.value=false}}; watch(()=>props.entityId,load,{immediate:true});
const submit=async()=>{if(!comment.value.trim())return;saving.value=true;error.value='';try{await props.submitComment(props.entityId,comment.value.trim());comment.value='';await load()}catch(e){error.value=e instanceof Error?e.message:'评论提交失败'}finally{saving.value=false}};
</script>
<template><div class="activity"><h4>动态与评论</h4><p v-if="loading" class="state">正在加载动态…</p><p v-else-if="error" class="state error">{{error}}</p><ul v-else-if="events.length"><li v-for="(item,index) in events" :key="String(item.id||index)"><strong>{{item.operatorName||item.creatorName||'系统'}}</strong><span>{{item.content||item.eventDescription||item.eventType||'发生了变更'}}</span><time>{{item.createdAt||''}}</time></li></ul><p v-else class="muted">暂无动态</p><textarea v-model="comment" rows="3" placeholder="写下评论…"/><button class="primary" :disabled="saving" @click="submit">{{saving?'提交中…':'发表评论'}}</button></div></template>
