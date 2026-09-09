<script setup lang="ts">
import {onMounted, reactive, ref, watch} from 'vue';
import {requirementRepository} from '../../services/requirementRepository';
import {productRepository} from '../../services/productRepository';
import VersionSelect from './VersionSelect.vue';
type RequirementValue = Record<string, unknown>;
const props = defineProps<{modelValue?: RequirementValue | null}>();
const emit = defineEmits<{save: [value: RequirementValue]; cancel: []}>();
const form = reactive({title:'', description:'', expectedGoal:'', priority:'', ownerName:'', productLineId:'', versionId:'', versionName:''});
const employees = ref<Array<{value:string;label:string}>>([]); const productLines = ref<Array<{value:string;label:string}>>([]); const loading = ref(true);
watch(() => props.modelValue, value => Object.assign(form, {title:'',description:'',expectedGoal:'',priority:'',ownerName:'',productLineId:'',versionId:'',versionName:'',...(value || {})}), {immediate:true});
onMounted(async () => {try {const [people, lines] = await Promise.all([requirementRepository.employees(), productRepository.productLines()]); employees.value = people.map(item => ({value:String(item.name || item.id || ''), label:String(item.name || item.id || '')})).filter(item => item.value); productLines.value = lines.map(item => ({value:String(item.id || ''), label:String(item.name || item.code || item.id || '')})).filter(item => item.value);} finally {loading.value = false;}});
</script>
<template><form class="work-item-form" @submit.prevent="emit('save', {...form})"><label>需求标题<input v-model="form.title" required placeholder="请输入需求标题" /></label><label>需求描述<textarea v-model="form.description" rows="4" placeholder="请输入需求描述" /></label><label>验收标准<textarea v-model="form.expectedGoal" rows="3" placeholder="请输入验收标准" /></label><div class="form-grid"><label>优先级<select v-model="form.priority"><option value="" disabled>请选择优先级</option><option>P0-紧急</option><option>P1-高优</option><option>P2-中</option><option>P3-低</option></select></label><label>负责人<select v-model="form.ownerName" :disabled="loading"><option value="" disabled>{{loading?'正在加载负责人…':'请选择负责人'}}</option><option v-for="person in employees" :key="person.value" :value="person.value">{{person.label}}</option></select></label></div><label>产品线<select v-model="form.productLineId" required :disabled="loading"><option value="" disabled>{{loading?'正在加载产品线…':'请选择产品线'}}</option><option v-for="line in productLines" :key="line.value" :value="line.value">{{line.label}}</option></select></label><VersionSelect v-model="form.versionId" :product-line-id="form.productLineId"/><div class="form-actions"><button type="button" class="secondary" @click="emit('cancel')">取消</button><button type="submit" class="primary">保存</button></div></form></template>
