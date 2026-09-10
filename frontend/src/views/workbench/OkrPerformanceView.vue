<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRouter} from 'vue-router';
import PageHeader from '../../components/common/PageHeader.vue';
import StatusTag from '../../components/common/StatusTag.vue';
import {workbenchRepository} from '../../services/workbenchRepository';

const router = useRouter();
const data = ref(workbenchRepository.load());

// Main tab state
const mainTab = ref<'okrs' | 'reviews'>('okrs');

// OKR tab states
const okrCategoryTab = ref<'my' | 'supervisor' | 'subordinate' | 'department' | 'other_dept'>('my');
const selectedCycle = ref('2026-09');
const isAddOkrOpen = ref(false);

// Review tab states
const reviewSubTab = ref<'write' | 'my' | 'received'>('write');
const isReviewFormOpen = ref(false);

// Add OKR form state
const newOkrForm = ref({
  cycle: '2026-09',
  objective: '',
  weight: 40,
  deadline: '2026-09-30',
  alignTo: '公司年度战略目标：突破智能协同千万级标杆市场',
  kr1Content: '',
  kr1Weight: 50,
  kr2Content: '',
  kr2Weight: 50
});

// Review form state
const reviewForm = ref({
  type: 'month' as 'week' | 'month',
  cycleName: '2026年8月月度复盘总结',
  summary: '',
  uncompleted: '',
  selfScore: 90,
  suggestions: '',
  helpNeeded: '',
  sendTo: '总经办, 部门主管'
});

// Filtered OKRs
const filteredOkrs = computed(() => {
  return data.value.okrs.filter(okr => {
    if (okr.cycle !== selectedCycle.value) return false;
    
    if (okrCategoryTab.value === 'my') return okr.category === 'my';
    if (okrCategoryTab.value === 'supervisor') return okr.category === 'supervisor';
    if (okrCategoryTab.value === 'subordinate') return okr.category === 'subordinate';
    if (okrCategoryTab.value === 'department') return okr.category === 'department';
    return true; // other_dept
  });
});

// Reviews
const myReviews = computed(() => data.value.reviews || []);

const handleSaveOkr = () => {
  if (!newOkrForm.value.objective.trim()) {
    alert('请填写目标(O)内容');
    return;
  }
  
  // Here would call API to save
  console.log('Save OKR:', newOkrForm.value);
  
  isAddOkrOpen.value = false;
  newOkrForm.value.objective = '';
  newOkrForm.value.kr1Content = '';
  newOkrForm.value.kr2Content = '';
};

const handleSubmitReview = () => {
  if (!reviewForm.value.summary.trim()) {
    alert('请填写本期总结核心内容');
    return;
  }
  
  // Here would call API to submit
  console.log('Submit Review:', reviewForm.value);
  
  reviewSubTab.value = 'my';
  isReviewFormOpen.value = false;
};

const openReviewForm = (type: 'week' | 'month') => {
  reviewForm.value.type = type;
  reviewForm.value.cycleName = type === 'week' ? '2026年第36周复盘总结' : '2026年8月月度复盘总结';
  isReviewFormOpen.value = true;
};

const cancelAddOkr = () => {
  isAddOkrOpen.value = false;
};
</script>

<template>
  <section class="okr-perf-view">
    <!-- Top Main Navigation -->
    <div class="main-nav">
      <div class="nav-tabs">
        <button 
          :class="['nav-tab', { active: mainTab === 'okrs' }]"
          @click="mainTab = 'okrs'"
        >
          目标 OKRs
        </button>
        <button 
          :class="['nav-tab', { active: mainTab === 'reviews' }]"
          @click="mainTab = 'reviews'; isReviewFormOpen = false"
        >
          复盘总结
        </button>
      </div>

      <div v-if="mainTab === 'okrs'" class="nav-actions">
        <select v-model="selectedCycle" class="cycle-select">
          <option value="2026-09">2026年09月（当前月份）</option>
          <option value="2026-08">2026年08月（上月）</option>
          <option value="2026-07">2026年07月（已归档）</option>
          <option value="2026-06">2026年06月（已归档）</option>
        </select>
        <button class="btn-add" @click="isAddOkrOpen = true">
          + 添加目标
        </button>
      </div>
    </div>

    <!-- OKRs Tab -->
    <div v-if="mainTab === 'okrs'" class="okrs-content">
      <!-- Sub Navigation -->
      <div class="sub-nav">
        <button 
          :class="['sub-nav-item', { active: okrCategoryTab === 'my' }]"
          @click="okrCategoryTab = 'my'"
        >
          我的 OKR
        </button>
        <button 
          :class="['sub-nav-item', { active: okrCategoryTab === 'supervisor' }]"
          @click="okrCategoryTab = 'supervisor'"
        >
          直属上级 OKR
        </button>
        <button 
          :class="['sub-nav-item', { active: okrCategoryTab === 'subordinate' }]"
          @click="okrCategoryTab = 'subordinate'"
        >
          直属下级 OKR
        </button>
        <button 
          :class="['sub-nav-item', { active: okrCategoryTab === 'department' }]"
          @click="okrCategoryTab = 'department'"
        >
          我部门的 OKR
        </button>
        <button 
          :class="['sub-nav-item', { active: okrCategoryTab === 'other_dept' }]"
          @click="okrCategoryTab = 'other_dept'"
        >
          跨部门协同 OKR
        </button>
      </div>

      <!-- Add OKR Form -->
      <form v-if="okrCategoryTab === 'my' && isAddOkrOpen" @submit.prevent="handleSaveOkr" class="add-okr-form">
        <div class="form-header">
          <div class="form-title">
            <span class="o-badge">O1</span>
            <span class="title-text">添加目标</span>
            <span class="cycle-text">{{ selectedCycle.replace('-', '年') }}月</span>
          </div>
          <span class="form-hint">填写完成后提交主管确认</span>
        </div>
        
        <div class="form-body">
          <div class="form-row-grid">
            <input 
              v-model="newOkrForm.objective"
              type="text" 
              required
              placeholder="输入目标名称：明确你想要达成什么，不写含糊概括的目标"
              class="form-input"
            />
            <select v-model="newOkrForm.cycle" class="form-select">
              <option value="2026-09">2026年09月</option>
              <option value="2026-08">2026年08月</option>
              <option value="2026-07">2026年07月</option>
            </select>
            <input 
              v-model.number="newOkrForm.weight"
              type="number" 
              min="0" 
              max="100"
              placeholder="权重 %"
              class="form-input-small"
            />
          </div>

          <input 
            v-model="newOkrForm.alignTo"
            type="text"
            placeholder="+ 选择对齐目标"
            class="form-input"
          />

          <textarea 
            v-model="newOkrForm.kr1Content"
            rows="2"
            placeholder="KR1 关键结果：遵循 SMART 原则，具体、可衡量、可达成、相关性、时效性"
            class="form-textarea"
          />

          <input 
            v-model="newOkrForm.deadline"
            type="date"
            class="form-input-date"
          />

          <div class="form-actions">
            <button type="button" @click="cancelAddOkr" class="btn-cancel">取消</button>
            <button type="submit" class="btn-submit">提交主管确认</button>
          </div>
        </div>
      </form>

      <!-- OKR List -->
      <div v-if="filteredOkrs.length === 0" class="empty-state">
        <div class="empty-icon">🎯</div>
        <h3>本月暂无目标</h3>
        <p>当前月份还没有填写 OKR，点击右上角"添加目标"开始设定。</p>
      </div>

      <div v-else class="okr-list">
        <div v-for="(okr, idx) in filteredOkrs" :key="okr.id" class="okr-card">
          <!-- OKR Header -->
          <div class="okr-header">
            <div class="okr-title-section">
              <div class="title-row">
                <span class="o-badge">O{{ idx + 1 }}</span>
                <h3>{{ okr.objective }}</h3>
              </div>
              <div v-if="okr.alignTo" class="align-info">
                <span class="align-label">对齐目标</span>
                <span>{{ okr.alignTo }}</span>
              </div>
            </div>
            
            <div class="okr-meta">
              <div class="meta-item">
                <span class="label">负责人</span>
                <span class="value">{{ okr.owner }}</span>
              </div>
              <div class="meta-item">
                <span class="label">权重</span>
                <span class="value">{{ okr.weight }}%</span>
              </div>
              <div class="meta-item">
                <span class="label">截止</span>
                <span class="value">{{ okr.deadline }}</span>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="okr-progress">
            <div class="progress-header">
              <span>整体进度</span>
              <strong>{{ okr.progress }}%</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${okr.progress}%` }" />
            </div>
          </div>

          <!-- KR List -->
          <div v-if="okr.keyResults && okr.keyResults.length" class="kr-list">
            <div v-for="(kr, krIdx) in okr.keyResults" :key="kr.id" class="kr-item">
              <div class="kr-header">
                <span class="kr-badge">KR{{ krIdx + 1 }}</span>
                <span class="kr-content">{{ kr.content }}</span>
                <span class="kr-progress">{{ kr.progress }}%</span>
              </div>
              <div class="kr-meta">
                <span>权重: {{ kr.weight }}%</span>
                <span>截止: {{ kr.deadline }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reviews Tab -->
    <div v-if="mainTab === 'reviews'" class="reviews-content">
      <!-- Sub Navigation -->
      <div class="sub-nav">
        <button 
          :class="['sub-nav-item', { active: reviewSubTab === 'write' }]"
          @click="reviewSubTab = 'write'; isReviewFormOpen = false"
        >
          写总结
        </button>
        <button 
          :class="['sub-nav-item', { active: reviewSubTab === 'my' }]"
          @click="reviewSubTab = 'my'; isReviewFormOpen = false"
        >
          我的总结
        </button>
        <button 
          :class="['sub-nav-item', { active: reviewSubTab === 'received' }]"
          @click="reviewSubTab = 'received'; isReviewFormOpen = false"
        >
          我收到的
        </button>
      </div>

      <!-- Write Review Tab -->
      <div v-if="reviewSubTab === 'write'" class="write-review-section">
        <div v-if="!isReviewFormOpen" class="review-actions">
          <button class="review-card" @click="openReviewForm('week')">
            <div class="card-icon">📅</div>
            <div class="card-content">
              <h4>写周工作总结</h4>
              <p>总结本周工作完成情况、心得与下周计划</p>
            </div>
          </button>
          <button class="review-card" @click="openReviewForm('month')">
            <div class="card-icon">📊</div>
            <div class="card-content">
              <h4>写月度复盘述职</h4>
              <p>总结本月核心事项、未达成分析与改进建议</p>
            </div>
          </button>
        </div>

        <!-- Review Form -->
        <form v-else @submit.prevent="handleSubmitReview" class="review-form">
          <div class="form-header">
            <h3>{{ reviewForm.type === 'week' ? '周工作总结' : '月度复盘述职' }}</h3>
            <div class="type-selector">
              <label class="radio-label">
                <input type="radio" value="week" v-model="reviewForm.type" @change="reviewForm.cycleName = '2026年第36周复盘总结'" />
                周工作总结
              </label>
              <label class="radio-label">
                <input type="radio" value="month" v-model="reviewForm.type" @change="reviewForm.cycleName = '2026年8月月度复盘总结'" />
                月度复盘述职
              </label>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label>总结周期名称 *</label>
              <input v-model="reviewForm.cycleName" type="text" required class="form-input" />
            </div>
            <div class="form-field">
              <label>个人绩效自评得分 (0-100分) *</label>
              <input v-model.number="reviewForm.selfScore" type="number" min="0" max="100" required class="form-input" />
            </div>
          </div>

          <div class="form-field">
            <label>本月 / 本周核心工作总结 *</label>
            <textarea 
              v-model="reviewForm.summary"
              rows="4"
              required
              placeholder="详细列举本周期主导完成的重点事项、突破成果及交付里程碑..."
              class="form-textarea"
            />
          </div>

          <div class="form-field">
            <label>本月 / 本周未完成任务说明及原因归因分析</label>
            <textarea 
              v-model="reviewForm.uncompleted"
              rows="2"
              placeholder="未达标事项、滞后原因分析与下阶段补救措施..."
              class="form-textarea"
            />
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label>对公司管理意见或建议</label>
              <textarea 
                v-model="reviewForm.suggestions"
                rows="2"
                placeholder="业务协同、流程机制或研发支持建议..."
                class="form-textarea"
              />
            </div>
            <div class="form-field">
              <label>需要协助 / 协调事项</label>
              <textarea 
                v-model="reviewForm.helpNeeded"
                rows="2"
                placeholder="需要跨部门支持、预算资源或高管协调事项..."
                class="form-textarea"
              />
            </div>
          </div>

          <div class="form-field">
            <label>发送参与人 (多个逗号隔开)</label>
            <input v-model="reviewForm.sendTo" type="text" class="form-input" />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-submit">提交复盘总结</button>
          </div>
        </form>
      </div>

      <!-- My Reviews / Received Reviews -->
      <div v-if="reviewSubTab === 'my' || reviewSubTab === 'received'" class="review-list">
        <div v-if="myReviews.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>暂无复盘总结</h3>
          <p>还没有提交过复盘总结，去"写总结"标签页开始填写。</p>
        </div>

        <div v-else class="reviews">
          <div v-for="review in myReviews" :key="review.id" class="review-card-item">
            <div class="review-header">
              <div>
                <strong>{{ review.cycleName }}</strong>
                <StatusTag :status="review.status" />
              </div>
              <div class="review-meta">
                <span>自评: {{ review.selfScore }}分</span>
                <span>{{ review.createdAt }}</span>
              </div>
            </div>
            <div class="review-body">
              <div class="review-section">
                <strong>核心工作总结</strong>
                <p>{{ review.summary }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.okr-perf-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Main Navigation */
.main-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.nav-tabs {
  display: flex;
  gap: 0.5rem;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-tab.active {
  background: #2F66F6;
  color: white;
}

.nav-tab:hover:not(.active) {
  background: #f1f5f9;
}

.nav-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.cycle-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  background: white;
  color: #0f172a;
}

.btn-add {
  padding: 0.375rem 0.75rem;
  background: #2F66F6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-add:hover {
  background: #1e40af;
}

/* Sub Navigation */
.sub-nav {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.75rem;
}

.sub-nav-item {
  padding: 0.625rem 0.75rem;
  border: none;
  background: none;
  color: #64748b;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.sub-nav-item.active {
  color: #2F66F6;
  border-bottom-color: #2F66F6;
}

.sub-nav-item:hover:not(.active) {
  color: #0f172a;
}

/* Add OKR Form */
.add-okr-form {
  border: 1px solid #3b82f6;
  border-radius: 0.75rem;
  overflow: hidden;
  background: white;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: #eff6ff;
  border-bottom: 1px solid #bfdbfe;
  font-size: 0.75rem;
}

.form-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.o-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background: #2F66F6;
  color: white;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.75rem;
}

.title-text {
  font-weight: 600;
  color: #0f172a;
}

.cycle-text {
  color: #94a3b8;
}

.form-hint {
  color: #94a3b8;
}

.form-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 0.75rem;
}

.form-row-grid {
  display: grid;
  grid-template-columns: 1fr 180px 140px;
  gap: 0.75rem;
}

.form-input,
.form-select,
.form-textarea,
.form-input-small,
.form-input-date {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: white;
  color: #0f172a;
  font-size: 0.75rem;
}

.form-textarea {
  resize: vertical;
}

.form-input-date {
  max-width: 14rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #f1f5f9;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: white;
  color: #64748b;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-submit {
  padding: 0.5rem 1rem;
  background: #2F66F6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-submit:hover {
  background: #1e40af;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  border: 2px dashed #e2e8f0;
  border-radius: 0.75rem;
  text-align: center;
}

.empty-icon {
  font-size: 2.25rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.375rem;
}

.empty-state p {
  font-size: 0.75rem;
  color: #64748b;
  max-width: 32rem;
}

/* OKR List */
.okr-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.okr-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.okr-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.okr-title-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-row h3 {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.align-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #64748b;
}

.align-label {
  padding: 0.125rem 0.375rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
  font-size: 0.625rem;
}

.okr-meta {
  display: flex;
  gap: 1.5rem;
  font-size: 0.75rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.meta-item .label {
  color: #94a3b8;
  font-size: 0.6875rem;
}

.meta-item .value {
  color: #0f172a;
  font-weight: 600;
}

.okr-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.progress-header span {
  color: #64748b;
}

.progress-header strong {
  color: #2F66F6;
  font-weight: 600;
}

.progress-bar {
  height: 0.5rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2F66F6, #60a5fa);
  border-radius: 0.25rem;
  transition: width 0.3s;
}

.kr-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.kr-item {
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.kr-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.kr-badge {
  padding: 0.125rem 0.375rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 0.25rem;
  font-weight: 600;
  font-size: 0.6875rem;
}

.kr-content {
  flex: 1;
  color: #475569;
}

.kr-progress {
  color: #2F66F6;
  font-weight: 600;
}

.kr-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: #94a3b8;
}

/* Reviews */
.write-review-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.review-card {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.review-card:hover {
  border-color: #2F66F6;
  box-shadow: 0 4px 12px rgba(47, 102, 246, 0.1);
}

.card-icon {
  font-size: 2rem;
}

.card-content h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.card-content p {
  font-size: 0.75rem;
  color: #64748b;
}

.review-form {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.review-form .form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  background: none;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1rem;
}

.review-form h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.type-selector {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-field label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #475569;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-card-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.75rem;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.review-header strong {
  font-size: 0.875rem;
  color: #0f172a;
}

.review-meta {
  display: flex;
  gap: 1rem;
  color: #94a3b8;
}

.review-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.review-section strong {
  display: block;
  margin-bottom: 0.375rem;
  color: #475569;
}

.review-section p {
  color: #64748b;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .main-nav {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .form-row-grid {
    grid-template-columns: 1fr;
  }
  
  .okr-header {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
