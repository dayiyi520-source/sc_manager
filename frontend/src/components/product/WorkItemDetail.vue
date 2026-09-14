<script setup lang="ts">
import {ref, watch} from 'vue';
import DetailFields from '../common/DetailFields.vue';
import WorkItemForm from './WorkItemForm.vue';
import {unifiedWorkItems} from '../../services/productRepository';
const emit=defineEmits<{save:[value:Record<string,unknown>];close:[]}>();
const editing=ref(false);
const props=defineProps<{kind:'requirement'|'design'|'dev'|'bug';record:Record<string,unknown>}>();
const children=ref<Array<Record<string,unknown>>>([]),relations=ref<Array<Record<string,unknown>>>([]),events=ref<Array<Record<string,unknown>>>([]),loading=ref(false),loadError=ref('');
const loadRelated=async()=>{const id=String(props.record.id||'');if(!id)return;loading.value=true;loadError.value='';try{[children.value,relations.value,events.value]=await Promise.all([unifiedWorkItems.children(id),unifiedWorkItems.relations(id),unifiedWorkItems.events(id)]);}catch(error){loadError.value=error instanceof Error?error.message:'关联信息加载失败';}finally{loading.value=false;}};
watch(()=>props.record.id,loadRelated,{immediate:true});
const fields=[{key:'code',label:'编号'},{key:'title',label:'标题'},{key:'type',label:'类型'},{key:'status',label:'状态'},{key:'ownerName',label:'负责人'},{key:'priority',label:'优先级'},{key:'productLineName',label:'产品线'},{key:'iterationName',label:'迭代'},{key:'description',label:'描述'},{key:'createdAt',label:'创建时间'}];
</script>
<template><div v-if="!editing"><DetailFields :record="record" :fields="fields"/><p v-if="loading" class="state">正在加载关联信息…</p><p v-else-if="loadError" class="state error">{{loadError}}</p><section v-else class="work-item-related"><h4>子工作项（{{children.length}}）</h4><ul v-if="children.length"><li v-for="item in children" :key="String(item.id)">{{item.code}} · {{item.title}} · {{item.status}}</li></ul><p v-else class="muted">暂无子工作项</p><h4>关联关系（{{relations.length}}）</h4><ul v-if="relations.length"><li v-for="item in relations" :key="`${item.fromId}-${item.toId}-${item.relationType}`">{{item.relationType}}：{{item.fromId}} → {{item.toId}}</li></ul><p v-else class="muted">暂无关联关系</p><h4>动态记录（{{events.length}}）</h4><ul v-if="events.length"><li v-for="item in events" :key="String(item.id)">{{item.eventType}} · {{item.toStatus||item.content_||'记录'}}</li></ul><p v-else class="muted">暂无动态记录</p></section><div class="form-actions"><button class="secondary" type="button" @click="emit('close')">关闭</button><button class="primary" type="button" @click="editing=true">编辑</button></div></div><WorkItemForm v-else :kind="kind" :model-value="record" @save="emit('save',$event)" @cancel="editing=false"/></template>
