<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {useRoute} from 'vue-router';
import {useQuery} from '@tanstack/vue-query';
import {unifiedWorkItems} from '../../services/productRepository';
import AsyncState from '../../components/common/AsyncState.vue';
import DetailDrawer from '../../components/common/DetailDrawer.vue';
import WorkItemTable from '../../components/product/WorkItemTable.vue';
import WorkItemForm from '../../components/product/WorkItemForm.vue';
import WorkItemDetail from '../../components/product/WorkItemDetail.vue';
const props=defineProps<{kind:'requirement'|'design'|'dev'|'bug'}>();
const route=useRoute();
const config={requirement:{title:'需求任务',type:'requirement' as const,columns:['编号','标题','状态','负责人','优先级'],keys:['code','title','status','ownerName','priority']},design:{title:'设计任务',type:'design' as const,columns:['编号','标题','状态','负责人','优先级'],keys:['code','title','status','ownerName','priority']},dev:{title:'研发任务',type:'development' as const,columns:['编号','标题','状态','负责人','优先级'],keys:['code','title','status','ownerName','priority']},bug:{title:'缺陷管理',type:'bug' as const,columns:['编号','标题','状态','负责人','优先级'],keys:['code','title','status','ownerName','priority']}} as const;
const current=computed(()=>config[props.kind]); const keyword=ref(''); const selected=ref<Record<string,unknown>|null>(null); const editorOpen=ref(false); const editing=ref<Record<string,unknown>|null>(null); const saving=ref(false); const saveError=ref('');
const query=useQuery({queryKey:computed(()=>['work-items',props.kind]),queryFn:()=>unifiedWorkItems.list(current.value.type,{keyword:keyword.value})});
const rows=computed(()=>{const items=query.data.value?.items||[];const key=keyword.value.trim().toLowerCase();return key?items.filter(item=>Object.values(item).some(value=>String(value??'').toLowerCase().includes(key))):items;});
const routeItemMissing=computed(()=>Boolean(route.query.workItemId)&&!query.isPending.value&&!rows.value.some(item=>String(item.id)===String(route.query.workItemId)));
const pending=computed(()=>Boolean(query.isPending.value)); const failed=computed(()=>Boolean(query.isError.value));
watch(()=>query.data.value,data=>{const id=String(route.query.workItemId||'');if(id){const found=(data?.items||[]).find(item=>String(item.id)===id);if(found)selected.value=found;}},{immediate:true});
const save=async(value:Record<string,unknown>)=>{if(!String(value.title||'').trim()){saveError.value='请输入标题';return;}saving.value=true;saveError.value='';try{if(editing.value?.id)await unifiedWorkItems.update(String(editing.value.id),value);else await unifiedWorkItems.create({...value,type:current.value.type});editorOpen.value=false;editing.value=null;await query.refetch();}catch(error){saveError.value=error instanceof Error?error.message:'保存失败';}finally{saving.value=false;}};
</script>
<template><section class="crm-view"><div class="section-heading"><div><span class="eyebrow">PRODUCT WORK ITEMS</span><h2>{{current.title}}</h2></div><button class="primary" @click="editorOpen=true">新建</button><button class="secondary" @click="query.refetch()">刷新</button></div><div class="toolbar"><input v-model="keyword" :placeholder="`搜索${current.title}`"/><span>{{rows.length}} 条记录</span></div><p v-if="routeItemMissing" class="form-feedback error">未找到指定的工作项，已展示当前列表。</p><p v-if="saving" class="form-feedback">正在保存…</p><p v-else-if="saveError" class="form-feedback error">{{saveError}}</p><AsyncState :pending="pending" :error="failed" :empty="!rows.length" :loading-text="`正在加载${current.title}…`" :error-text="`${current.title}加载失败。`" empty-text="暂无匹配记录。"><WorkItemTable :rows="rows" :columns="[...current.columns]" :keys="[...current.keys]" @select="selected=$event"/></AsyncState><DetailDrawer :open="Boolean(selected)" :title="`${current.title}详情`" @close="selected=null"><WorkItemDetail v-if="selected" :kind="props.kind" :record="selected" @save="save" @close="selected=null"/></DetailDrawer><DetailDrawer :open="editorOpen" :title="`新建${current.title}`" @close="editorOpen=false"><WorkItemForm :kind="props.kind" @save="save" @cancel="editorOpen=false"/></DetailDrawer></section></template>
