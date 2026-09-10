<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';
import RichTextEditor from './RichTextEditor.vue';

interface RequirementTask {
  id?: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  expectedGoal?: string;
  status?: string;
  priority?: string;
  ownerName?: string;
  creatorName?: string;
  productLineName?: string;
  versionName?: string;
  customerName?: string;
  plannedStartDate?: string;
  dueDate?: string;
  createdAt?: string;
  estimatedHours?: number;
  requirementType?: string;
  expectedCompleteDate?: string;
}

interface Props {
  open: boolean;
  task?: RequirementTask | null;
  mode?: 'create' | 'edit';
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', task: RequirementTask): void;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  task: null,
  mode: 'create'
});

const emit = defineEmits<Emits>();

// 表单数据
const formData = ref<RequirementTask>({
  title: '',
  description: '',
  descriptionHtml: '',
  expectedGoal: '',
  priority: '中',
  ownerName: '',
  productLineName: '',
  versionName: '',
  customerName: '',
  estimatedHours: 0,
  requirementType: '',
  plannedStartDate: '',
  dueDate: '',
  expectedCompleteDate: ''
});

// 监听 task 变化，初始化表单
watch(() => props.task, (newTask) => {
  if (newTask) {
    formData.value = { ...newTask };
  } else {
    resetForm();
  }
}, { immediate: true });

// 选项数据（实际应该从API获取）
const priorityOptions = ['紧急', '高', '中', '低'];
const statusOptions = ['待处理', '进行中', '已完成', '已关闭'];
const requirementTypeOptions = ['业务需求', '产品优化', '技术需求', '合规需求'];

// Mock 数据
const employees = ['张三', '李四', '王五', '赵六'];
const productLines = ['产品线A', '产品线B', '产品线C'];
const versions = ['V1.0', 'V1.1', 'V2.0'];
const customers = ['客户A', '客户B', '客户C'];

const modalTitle = computed(() => props.mode === 'create' ? '新建需求任务' : '编辑需求任务');

function resetForm() {
  formData.value = {
    title: '',
    description: '',
    descriptionHtml: '',
    expectedGoal: '',
    priority: '中',
    ownerName: '',
    productLineName: '',
    versionName: '',
    customerName: '',
    estimatedHours: 0,
    requirementType: '',
    plannedStartDate: '',
    dueDate: '',
    expectedCompleteDate: ''
  };
}

function handleSave() {
  if (!formData.value.title.trim()) {
    alert('请输入需求标题');
    return;
  }
  
  emit('save', { ...formData.value });
  resetForm();
}

function handleClose() {
  emit('close');
  resetForm();
}

function updateDescription(text: string, html: string) {
  formData.value.description = text;
  formData.value.descriptionHtml = html;
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click="handleClose">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>{{ modalTitle }}</h2>
        <button class="close-btn" @click="handleClose">
          <X :size="20" />
        </button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="handleSave">
          <!-- 基础信息 -->
          <div class="form-section">
            <h3 class="section-title">基础信息</h3>
            
            <div class="form-field">
              <label class="required">需求标题</label>
              <input
                v-model="formData.title"
                type="text"
                placeholder="例如：支持达梦DM8数据库读写分离与主备秒级切换"
                required
              />
            </div>
            
            <div class="form-field">
              <label>验收标准</label>
              <input
                v-model="formData.expectedGoal"
                type="text"
                placeholder="例如：通过自动化单测，支撑压测 QPS 突破 5000"
              />
            </div>
            
            <div class="form-field">
              <label>任务描述</label>
              <RichTextEditor
                v-model="formData.description"
                :html-value="formData.descriptionHtml || ''"
                placeholder="详细记录需求背景、业务场景和实现说明..."
                @update:model-value="(text) => formData.description = text"
                @update:html-value="(html) => formData.descriptionHtml = html"
              />
            </div>
          </div>
          
          <!-- 分类与优先级 -->
          <div class="form-section">
            <h3 class="section-title">分类与优先级</h3>
            
            <div class="form-grid">
              <div class="form-field">
                <label>需求类型</label>
                <select v-model="formData.requirementType">
                  <option value="">请选择</option>
                  <option v-for="type in requirementTypeOptions" :key="type" :value="type">
                    {{ type }}
                  </option>
                </select>
              </div>
              
              <div class="form-field">
                <label class="required">优先级</label>
                <select v-model="formData.priority" required>
                  <option v-for="priority in priorityOptions" :key="priority" :value="priority">
                    {{ priority }}
                  </option>
                </select>
              </div>
              
              <div v-if="mode === 'edit'" class="form-field">
                <label>状态</label>
                <select v-model="formData.status">
                  <option v-for="status in statusOptions" :key="status" :value="status">
                    {{ status }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- 责任人与关联 -->
          <div class="form-section">
            <h3 class="section-title">责任人与关联</h3>
            
            <div class="form-grid">
              <div class="form-field">
                <label class="required">负责人</label>
                <select v-model="formData.ownerName" required>
                  <option value="">请选择</option>
                  <option v-for="employee in employees" :key="employee" :value="employee">
                    {{ employee }}
                  </option>
                </select>
              </div>
              
              <div class="form-field">
                <label>所属产品线</label>
                <select v-model="formData.productLineName">
                  <option value="">请选择</option>
                  <option v-for="line in productLines" :key="line" :value="line">
                    {{ line }}
                  </option>
                </select>
              </div>
              
              <div class="form-field">
                <label>迭代版本</label>
                <select v-model="formData.versionName">
                  <option value="">请选择</option>
                  <option v-for="version in versions" :key="version" :value="version">
                    {{ version }}
                  </option>
                </select>
              </div>
              
              <div class="form-field">
                <label>关联客户</label>
                <select v-model="formData.customerName">
                  <option value="">请选择</option>
                  <option v-for="customer in customers" :key="customer" :value="customer">
                    {{ customer }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- 时间与工时 -->
          <div class="form-section">
            <h3 class="section-title">时间与工时</h3>
            
            <div class="form-grid">
              <div class="form-field">
                <label>计划开始时间</label>
                <input v-model="formData.plannedStartDate" type="date" />
              </div>
              
              <div class="form-field">
                <label>计划完成时间</label>
                <input v-model="formData.dueDate" type="date" />
              </div>
              
              <div class="form-field">
                <label>期望完成时间</label>
                <input v-model="formData.expectedCompleteDate" type="date" />
              </div>
              
              <div class="form-field">
                <label>预计工时（小时）</label>
                <input
                  v-model.number="formData.estimatedHours"
                  type="number"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn-secondary" @click="handleClose">
          取消
        </button>
        <button type="submit" class="btn-primary" @click="handleSave">
          {{ mode === 'create' ? '创建' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  background: var(--bg-card);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-main);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--bg-surface-soft);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.form-section {
  margin-bottom: 24px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-field {
  margin-bottom: 16px;
}

.form-field:last-child {
  margin-bottom: 0;
}

.form-field label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.form-field label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: all 0.15s;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.form-field textarea {
  resize: vertical;
  min-height: 80px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-main);
}

.btn-secondary,
.btn-primary {
  height: 36px;
  padding: 0 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-main);
}

.btn-secondary:hover {
  background: var(--bg-surface-soft);
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}
</style>
