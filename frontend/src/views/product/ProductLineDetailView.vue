<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRouter, useRoute} from 'vue-router';
import {useQuery} from '@tanstack/vue-query';
import {productRepository} from '../../services/productRepository';
import StatusTag from '../../components/common/StatusTag.vue';

const router = useRouter();
const route = useRoute();

const productLineId = computed(() => String(route.params.productLineId || route.query.id || ''));

// Tab state
const activeTab = ref<'products' | 'versions' | 'members' | 'requirements' | 'bugs' | 'tasks'>('products');

// Modals
const isAddProductOpen = ref(false);
const isEditLeadsOpen = ref(false);
const isManageMembersOpen = ref(false);
const isCreateVersionOpen = ref(false);

// Product line query
const query = useQuery({
  queryKey: computed(() => ['product-line-detail', productLineId.value]),
  queryFn: async () => {
    // Mock data for now - replace with real API call
    return {
      id: productLineId.value,
      name: '师创智联协同OS',
      code: 'SCLX-OS',
      description: '企业级智能协同操作系统，支持混合云部署、多租户SaaS与私有化交付',
      owner: '张瑞',
      requirementOwner: '毛景强',
      techOwner: '王浩然',
      testOwner: '陈小敏',
      currentVersion: 'V3.5.2',
      health: '启用中',
      customerCount: 28,
      createdAt: '2024-01-01',
      products: [
        {id: 'p1', name: '低代码平台', code: 'SCLX-LOWCODE', version: 'V2.1.0', status: '运营中', description: '可视化拖拽式应用构建平台'},
        {id: 'p2', name: '数据中台', code: 'SCLX-DATA', version: 'V1.8.3', status: '运营中', description: '企业级数据治理与分析平台'}
      ],
      versions: [
        {id: 'v1', name: 'V3.6.0', status: '规划中', startDate: '2026-10-01', endDate: '2026-12-31', progress: 15},
        {id: 'v2', name: 'V3.5.2', status: '已发布', startDate: '2026-07-01', endDate: '2026-09-30', progress: 100}
      ],
      members: [
        {id: 'm1', name: '张瑞', role: '产品经理', department: '产品部'},
        {id: 'm2', name: '王浩然', role: '技术负责人', department: '研发部'},
        {id: 'm3', name: '陈小敏', role: '测试负责人', department: '质量部'}
      ],
      requirements: [
        {id: 'r1', title: '支持双人同行人脸比对', status: '待评审', priority: 'P0-紧急'},
        {id: 'r2', title: '第三方消息卡片一键催办', status: '已采纳', priority: 'P1-高优'}
      ],
      bugs: [
        {id: 'b1', title: '修复迭代详情关联任务显示异常', status: '待处理', priority: 'P0-紧急'},
        {id: 'b2', title: '移动端弱网环境优化', status: '进行中', priority: 'P1-高优'}
      ],
      tasks: [
        {id: 't1', title: '完善需求任务筛选能力', status: '进行中', developer: '李明'},
        {id: 't2', title: '审批中心Vue页面验收', status: '已完成', developer: '林志豪'}
      ]
    };
  },
  enabled: computed(() => !!productLineId.value)
});

const productLine = computed(() => query.data.value);

// Stats
const stats = computed(() => {
  if (!productLine.value) return null;
  return {
    productsCount: productLine.value.products?.length || 0,
    versionsCount: productLine.value.versions?.length || 0,
    pendingReqs: productLine.value.requirements?.filter((r: any) => r.status !== '已拒绝').length || 0,
    pendingBugs: productLine.value.bugs?.filter((b: any) => b.status !== '已关闭').length || 0,
    pendingTasks: productLine.value.tasks?.filter((t: any) => t.status !== '已完成').length || 0,
    customerCount: productLine.value.customerCount || 0
  };
});

// Add product form
const productForm = ref({
  name: '',
  code: '',
  version: 'V1.0.0',
  status: '运营中' as '运营中' | '研发中' | '规划中' | '维护期',
  description: ''
});

// Edit leads form
const leadsForm = ref({
  requirementOwner: '',
  techOwner: '',
  testOwner: ''
});

const openEditLeads = () => {
  if (productLine.value) {
    leadsForm.value = {
      requirementOwner: productLine.value.requirementOwner || '',
      techOwner: productLine.value.techOwner || '',
      testOwner: productLine.value.testOwner || ''
    };
  }
  isEditLeadsOpen.value = true;
};

const handleSaveProduct = () => {
  if (!productForm.value.name.trim()) {
    alert('请填写产品名称');
    return;
  }
  console.log('Save product:', productForm.value);
  isAddProductOpen.value = false;
  productForm.value = {name: '', code: '', version: 'V1.0.0', status: '运营中', description: ''};
};

const handleSaveLeads = () => {
  console.log('Save leads:', leadsForm.value);
  isEditLeadsOpen.value = false;
};

const goBack = () => {
  router.push('/app/prod_lines');
};
</script>

<template>
  <section class="product-line-detail">
    <div v-if="query.isPending.value" class="loading">正在加载产品线详情...</div>
    <div v-else-if="query.isError.value" class="error">加载失败</div>
    <div v-else-if="!productLine" class="not-found">
      <p>未找到指定产品线信息</p>
      <button @click="goBack" class="btn-back">返回产品线列表</button>
    </div>

    <div v-else class="content">
      <!-- Top Navigation -->
      <div class="top-nav">
        <button @click="goBack" class="btn-back">← 返回产品线矩阵</button>
        <div class="actions">
          <button @click="openEditLeads" class="btn-action">👤 负责人配置</button>
          <button @click="isManageMembersOpen = true" class="btn-action">👥 管理成员</button>
          <button @click="isAddProductOpen = true" class="btn-action">📦 添加包含产品</button>
          <button @click="isCreateVersionOpen = true" class="btn-primary">+ 创建版本</button>
        </div>
      </div>

      <!-- Hero Banner -->
      <div class="hero-banner">
        <div class="hero-content">
          <div class="hero-header">
            <div>
              <h2>{{ productLine.name }}</h2>
              <p class="description">{{ productLine.description }}</p>
            </div>
            <div class="hero-meta">
              <div>立项规划日：<span>{{ productLine.createdAt }}</span></div>
              <div>综合负责人：<span class="owner">{{ productLine.owner }}</span></div>
            </div>
          </div>

          <!-- Three Key Leads -->
          <div class="leads-row">
            <div class="lead-card">
              <div class="lead-icon req">RQ</div>
              <div class="lead-info">
                <div class="lead-label">需求负责人 (Req Lead)</div>
                <div class="lead-name">{{ productLine.requirementOwner }}</div>
                <div class="lead-desc">需求评审与产品路线规划主导</div>
              </div>
            </div>
            <div class="lead-card">
              <div class="lead-icon tech">TL</div>
              <div class="lead-info">
                <div class="lead-label">技术负责人 (Tech Lead)</div>
                <div class="lead-name">{{ productLine.techOwner }}</div>
                <div class="lead-desc">系统架构演进与技术选型</div>
              </div>
            </div>
            <div class="lead-card">
              <div class="lead-icon qa">QA</div>
              <div class="lead-info">
                <div class="lead-label">测试负责人 (QA Lead)</div>
                <div class="lead-name">{{ productLine.testOwner }}</div>
                <div class="lead-desc">封版验收与质量基线</div>
              </div>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">包含产品数</span>
              <div class="stat-value">{{ stats?.productsCount }} 款</div>
              <span class="stat-hint">矩阵覆盖</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">迭代版本数</span>
              <div class="stat-value">{{ stats?.versionsCount }} 个</div>
              <span class="stat-hint">CI/CD流水线</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">待办需求</span>
              <div class="stat-value purple">{{ stats?.pendingReqs }} 个</div>
              <span class="stat-hint">需求池待排期</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">待办缺陷</span>
              <div class="stat-value red">{{ stats?.pendingBugs }} 处</div>
              <span class="stat-hint">待修复验证</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">研发任务中</span>
              <div class="stat-value green">{{ stats?.pendingTasks }} 项</div>
              <span class="stat-hint">在研特性</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">落地客户数</span>
              <div class="stat-value amber">{{ stats?.customerCount }} 家</div>
              <span class="stat-hint">央国企与500强</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-nav">
        <button 
          :class="['tab-item', {active: activeTab === 'products'}]"
          @click="activeTab = 'products'"
        >
          📦 包含产品 ({{ productLine.products?.length || 0 }})
        </button>
        <button 
          :class="['tab-item', {active: activeTab === 'versions'}]"
          @click="activeTab = 'versions'"
        >
          🔄 迭代版本 ({{ productLine.versions?.length || 0 }})
        </button>
        <button 
          :class="['tab-item', {active: activeTab === 'members'}]"
          @click="activeTab = 'members'"
        >
          👥 团队成员 ({{ productLine.members?.length || 0 }})
        </button>
        <button 
          :class="['tab-item', {active: activeTab === 'requirements'}]"
          @click="activeTab = 'requirements'"
        >
          📋 关联需求 ({{ productLine.requirements?.length || 0 }})
        </button>
        <button 
          :class="['tab-item', {active: activeTab === 'bugs'}]"
          @click="activeTab = 'bugs'"
        >
          🐛 关联缺陷 ({{ productLine.bugs?.length || 0 }})
        </button>
        <button 
          :class="['tab-item', {active: activeTab === 'tasks'}]"
          @click="activeTab = 'tasks'"
        >
          ⚙️ 研发任务 ({{ productLine.tasks?.length || 0 }})
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Products Tab -->
        <div v-if="activeTab === 'products'" class="products-list">
          <div v-for="product in productLine.products" :key="product.id" class="product-card">
            <div class="product-header">
              <div>
                <h4>{{ product.name }}</h4>
                <span class="product-code">{{ product.code }}</span>
              </div>
              <StatusTag :status="product.status" />
            </div>
            <p class="product-desc">{{ product.description }}</p>
            <div class="product-footer">
              <span>当前版本: {{ product.version }}</span>
            </div>
          </div>
        </div>

        <!-- Versions Tab -->
        <div v-if="activeTab === 'versions'" class="versions-list">
          <div v-for="version in productLine.versions" :key="version.id" class="version-card">
            <div class="version-header">
              <h4>{{ version.name }}</h4>
              <StatusTag :status="version.status" />
            </div>
            <div class="version-meta">
              <span>{{ version.startDate }} ~ {{ version.endDate }}</span>
              <span>进度: {{ version.progress }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{width: `${version.progress}%`}" />
            </div>
          </div>
        </div>

        <!-- Members Tab -->
        <div v-if="activeTab === 'members'" class="members-list">
          <div v-for="member in productLine.members" :key="member.id" class="member-card">
            <div class="member-avatar">{{ member.name.slice(0, 1) }}</div>
            <div class="member-info">
              <h4>{{ member.name }}</h4>
              <span class="member-role">{{ member.role }}</span>
              <span class="member-dept">{{ member.department }}</span>
            </div>
          </div>
        </div>

        <!-- Requirements Tab -->
        <div v-if="activeTab === 'requirements'" class="requirements-list">
          <div v-for="req in productLine.requirements" :key="req.id" class="req-card">
            <div class="req-header">
              <h4>{{ req.title }}</h4>
              <StatusTag :status="req.priority" />
            </div>
            <StatusTag :status="req.status" />
          </div>
        </div>

        <!-- Bugs Tab -->
        <div v-if="activeTab === 'bugs'" class="bugs-list">
          <div v-for="bug in productLine.bugs" :key="bug.id" class="bug-card">
            <div class="bug-header">
              <h4>{{ bug.title }}</h4>
              <StatusTag :status="bug.priority" />
            </div>
            <StatusTag :status="bug.status" />
          </div>
        </div>

        <!-- Tasks Tab -->
        <div v-if="activeTab === 'tasks'" class="tasks-list">
          <div v-for="task in productLine.tasks" :key="task.id" class="task-card">
            <div class="task-header">
              <h4>{{ task.title }}</h4>
              <StatusTag :status="task.status" />
            </div>
            <span class="task-dev">开发者: {{ task.developer }}</span>
          </div>
        </div>
      </div>

      <!-- Modals (Simplified) -->
      <div v-if="isAddProductOpen" class="modal-overlay" @click="isAddProductOpen = false">
        <div class="modal-content" @click.stop>
          <h3>添加包含产品</h3>
          <form @submit.prevent="handleSaveProduct">
            <input v-model="productForm.name" placeholder="产品名称" required />
            <input v-model="productForm.code" placeholder="产品编码" />
            <input v-model="productForm.version" placeholder="当前版本" />
            <select v-model="productForm.status">
              <option value="运营中">运营中</option>
              <option value="研发中">研发中</option>
              <option value="规划中">规划中</option>
              <option value="维护期">维护期</option>
            </select>
            <textarea v-model="productForm.description" placeholder="产品描述" rows="3" />
            <div class="modal-actions">
              <button type="button" @click="isAddProductOpen = false">取消</button>
              <button type="submit" class="btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>

      <div v-if="isEditLeadsOpen" class="modal-overlay" @click="isEditLeadsOpen = false">
        <div class="modal-content" @click.stop>
          <h3>负责人配置</h3>
          <form @submit.prevent="handleSaveLeads">
            <label>需求负责人</label>
            <input v-model="leadsForm.requirementOwner" required />
            <label>技术负责人</label>
            <input v-model="leadsForm.techOwner" required />
            <label>测试负责人</label>
            <input v-model="leadsForm.testOwner" required />
            <div class="modal-actions">
              <button type="button" @click="isEditLeadsOpen = false">取消</button>
              <button type="submit" class="btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.product-line-detail {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading, .error, .not-found {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-back {
  padding: 0.5rem 1rem;
  background: #18212C;
  color: #A5ADBA;
  border: 1px solid #2C3440;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #202936;
  color: #F8FAFC;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.5rem 0.75rem;
  background: #18212C;
  color: #A5ADBA;
  border: 1px solid #2C3440;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #202936;
  color: #F8FAFC;
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: #2F66F6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #3B73FF;
}

.hero-banner {
  background: #121923;
  border: 1px solid #2C3440;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.hero-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #F8FAFC;
  margin-bottom: 0.5rem;
}

.description {
  font-size: 0.75rem;
  color: #A5ADBA;
  line-height: 1.5;
}

.hero-meta {
  text-align: right;
  font-size: 0.75rem;
  color: #7C8796;
}

.hero-meta span {
  color: #A5ADBA;
  font-family: monospace;
}

.hero-meta .owner {
  color: #6EA0FF;
  font-weight: 500;
}

.leads-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #2C3440;
}

.lead-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #151A22;
  border: 1px solid #2C3440;
  border-radius: 0.75rem;
}

.lead-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
}

.lead-icon.req {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #a78bfa;
}

.lead-icon.tech {
  background: rgba(47, 102, 246, 0.15);
  border: 1px solid rgba(47, 102, 246, 0.3);
  color: #6EA0FF;
}

.lead-icon.qa {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.lead-info {
  flex: 1;
  min-width: 0;
}

.lead-label {
  font-size: 0.6875rem;
  color: #7C8796;
}

.lead-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #F8FAFC;
  margin-top: 0.125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lead-desc {
  font-size: 0.625rem;
  color: #6EA0FF;
  margin-top: 0.125rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.stat-card {
  padding: 0.75rem;
  background: #151A22;
  border: 1px solid #2C3440;
  border-radius: 0.75rem;
}

.stat-label {
  display: block;
  font-size: 0.6875rem;
  color: #7C8796;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #F8FAFC;
  font-family: monospace;
  margin: 0.25rem 0;
}

.stat-value.purple { color: #a78bfa; }
.stat-value.red { color: #f87171; }
.stat-value.green { color: #34d399; }
.stat-value.amber { color: #fbbf24; }

.stat-hint {
  display: block;
  font-size: 0.625rem;
  color: #2F66F6;
}

.tabs-nav {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #2C3440;
  overflow-x: auto;
}

.tab-item {
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #7C8796;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-item.active {
  color: #2F66F6;
  border-bottom-color: #2F66F6;
}

.tab-item:hover:not(.active) {
  color: #F8FAFC;
}

.tab-content {
  min-height: 300px;
}

.products-list,
.versions-list,
.members-list,
.requirements-list,
.bugs-list,
.tasks-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.product-card,
.version-card,
.member-card,
.req-card,
.bug-card,
.task-card {
  padding: 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.product-header,
.version-header,
.bug-header,
.req-header,
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.product-header h4,
.version-header h4,
.req-header h4,
.bug-header h4,
.task-header h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
}

.product-code {
  font-size: 0.75rem;
  color: #64748b;
  font-family: monospace;
}

.product-desc {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.5;
}

.product-footer,
.version-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #64748b;
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

.member-card {
  flex-direction: row;
  align-items: center;
}

.member-avatar {
  width: 3rem;
  height: 3rem;
  background: #2F66F6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.125rem;
}

.member-info {
  flex: 1;
}

.member-info h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
}

.member-role {
  display: block;
  font-size: 0.75rem;
  color: #2F66F6;
  margin-top: 0.125rem;
}

.member-dept {
  display: block;
  font-size: 0.6875rem;
  color: #94a3b8;
}

.task-dev {
  font-size: 0.75rem;
  color: #64748b;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 1rem;
}

.modal-content form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-content label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #475569;
  margin-bottom: -0.5rem;
}

.modal-content input,
.modal-content select,
.modal-content textarea {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.modal-actions button {
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.modal-actions button[type="button"] {
  background: white;
  color: #64748b;
}

@media (max-width: 768px) {
  .top-nav {
    flex-direction: column;
    gap: 1rem;
  }
  
  .actions {
    flex-wrap: wrap;
  }
  
  .hero-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .hero-meta {
    text-align: left;
  }
}
</style>
