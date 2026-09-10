<script setup lang="ts">
import {computed,reactive,ref} from 'vue';
import SegmentTabs from '../../components/common/SegmentTabs.vue';
import SearchFilterBar from '../../components/common/SearchFilterBar.vue';
import EmptyState from '../../components/common/EmptyState.vue';
import DetailDrawer from '../../components/common/DetailDrawer.vue';
import StatusTag from '../../components/common/StatusTag.vue';
import {workbenchRepository} from '../../services/workbenchRepository';
import type {KnowledgeDocument} from '../../types';

const data=ref(workbenchRepository.load());
const mode=ref('home');
const keyword=ref('');
const category=ref('全部');
const onlyFavorites=ref(false);
const selected=ref<KnowledgeDocument|null>(null);
const uploadOpen=ref(false);
const form=reactive({title:'',category:'',tags:'',summary:'',content:''});

const categories=computed(()=>['全部',...new Set(data.value.documents.map(item=>item.category))]);
const rows=computed(()=>data.value.documents.filter(item=>(category.value==='全部'||item.category===category.value)&&(!onlyFavorites.value||item.favorite)&&[item.title,item.author,item.summary,...item.tags].join(' ').toLowerCase().includes(keyword.value.toLowerCase())));

const categoryStats = computed(() => {
  const stats: Record<string, {count: number; icon: string; desc: string; tags: string[]}> = {
    '应知应会': {count: 0, icon: '📖', desc: '行业知识培训、规章制度', tags: ['行业知识', '规章制度']},
    '产研规范': {count: 0, icon: '⚙️', desc: '研发、产品、设计、交付规范', tags: ['研发规范', '产品规范', '设计规范']},
    '产品沉淀': {count: 0, icon: '📊', desc: '产品设计、研发、交付、部署文档', tags: ['设计文档', '研发文档', '交付文档']},
    '项目沉淀': {count: 0, icon: '📈', desc: '项目验收、技术支持、运维文档', tags: ['验收文档', '技术支持']}
  };
  data.value.documents.forEach(doc => {
    if (stats[doc.category]) {
      stats[doc.category].count++;
    }
  });
  return stats;
});

const recentDocs = computed(() => data.value.documents.slice(0, 5));

const persist=()=>workbenchRepository.save(data.value);
const toggle=(item:KnowledgeDocument)=>{item.favorite=!item.favorite;persist()};
const add=()=>{if(!form.title||!form.category)return;data.value.documents.unshift({id:`DOC-${Date.now()}`,title:form.title,category:form.category,tags:form.tags.split(/[,，]/).map(x=>x.trim()).filter(Boolean),author:'当前用户',version:'V1.0',updatedAt:new Date().toISOString().slice(0,10),views:0,favorite:false,summary:form.summary,content:form.content});persist();uploadOpen.value=false;Object.assign(form,{title:'',category:'',tags:'',summary:'',content:''})};
const searchAndSwitch = () => { mode.value = 'center'; };
</script>

<template>
  <section class="workbench-view knowledge-base-view">
    <div class="page-actions">
      <button class="primary" @click="uploadOpen=true">上传文档</button>
    </div>

    <SegmentTabs v-model="mode" :items="[{key:'home',label:'知识首页'},{key:'center',label:'知识中心',count:data.documents.length}]"/>

    <!-- 知识首页 -->
    <div v-if="mode==='home'" class="knowledge-home">
      <!-- Hero 区域 -->
      <div class="knowledge-hero-new">
        <h2>知识，让工作更高效</h2>
        <p>汇聚全公司知识沉淀，助力每一位师创人快速成长</p>
        <div class="hero-search">
          <input v-model="keyword" placeholder="搜索文档、培训资料、行业报告..." @keyup.enter="searchAndSwitch"/>
          <button class="search-btn" @click="searchAndSwitch">搜索</button>
        </div>
        <div class="hot-tags">
          <span>热门搜索：</span>
          <button v-for="tag in ['产品规范', '研发规范', '售前PPT', '竞品分析', '行业报告', '部署规范']" :key="tag" @click="keyword=tag;searchAndSwitch()">{{tag}}</button>
        </div>
      </div>

      <!-- 知识分类 -->
      <h3 class="section-title">知识分类</h3>
      <div class="category-cards">
        <article v-for="(stat, name) in categoryStats" :key="name" class="category-card" @click="category=name as string;mode='center'">
          <div class="card-header">
            <span class="card-icon">{{stat.icon}}</span>
            <span class="card-count">{{stat.count}} 篇</span>
          </div>
          <h4>{{name}}</h4>
          <p>{{stat.desc}}</p>
          <div class="card-tags">
            <span v-for="tag in stat.tags" :key="tag">{{tag}}</span>
          </div>
        </article>
      </div>

      <!-- 最近更新 -->
      <h3 class="section-title">最近更新<span class="subtitle">本周更新 {{recentDocs.length}} 篇</span></h3>
      <div class="recent-list">
        <article v-for="item in recentDocs" :key="item.id" class="recent-item" @click="selected=item">
          <div class="item-icon">
            <span>📄</span>
          </div>
          <div class="item-content">
            <div class="item-header">
              <h4>{{item.title}}</h4>
              <button class="fav-btn" @click.stop="toggle(item)">{{item.favorite ? '★' : '☆'}}</button>
            </div>
            <p class="item-meta">
              <StatusTag :status="item.category"/>
              <span>{{item.author}}</span>
              <span>{{item.updatedAt}}</span>
              <span>阅读 {{item.views}}</span>
            </p>
          </div>
        </article>
      </div>
    </div>

    <!-- 文档中心 -->
    <template v-else>
      <SearchFilterBar v-model="keyword" placeholder="搜索标题、作者、标签或摘要" :count="rows.length">
        <select v-model="category">
          <option v-for="item in categories" :key="item">{{item}}</option>
        </select>
        <label class="inline-check">
          <input v-model="onlyFavorites" type="checkbox"/>只看收藏
        </label>
      </SearchFilterBar>
      
      <div v-if="rows.length" class="document-grid">
        <article v-for="item in rows" :key="item.id" @click="selected=item">
          <div class="document-meta">
            <StatusTag :status="item.category"/>
            <button class="favorite" @click.stop="toggle(item)">{{item.favorite?'★':'☆'}}</button>
          </div>
          <h3>{{item.title}}</h3>
          <p>{{item.summary}}</p>
          <div class="tag-list">
            <span v-for="tag in item.tags" :key="tag">{{tag}}</span>
          </div>
          <small>{{item.author}} · {{item.version}} · {{item.views}} 次浏览</small>
        </article>
      </div>
      <EmptyState v-else title="没有匹配的文档" description="请调整搜索词或筛选条件。"/>
    </template>

    <DetailDrawer :open="Boolean(selected)" :title="selected?.title||'文档详情'" @close="selected=null">
      <template v-if="selected">
        <div class="document-detail">
          <div>
            <StatusTag :status="selected.category"/>
            <button class="favorite" @click="toggle(selected)">{{selected.favorite?'★ 已收藏':'☆ 收藏'}}</button>
          </div>
          <p class="muted">{{selected.author}} · {{selected.version}} · 更新于 {{selected.updatedAt}}</p>
          <h4>摘要</h4>
          <p>{{selected.summary||'暂无摘要'}}</p>
          <h4>正文</h4>
          <p class="document-content">{{selected.content||'暂无正文内容'}}</p>
          <div class="tag-list">
            <span v-for="tag in selected.tags" :key="tag">{{tag}}</span>
          </div>
        </div>
      </template>
    </DetailDrawer>

    <DetailDrawer :open="uploadOpen" title="上传 / 沉淀知识文档" @close="uploadOpen=false">
      <form class="work-item-form" @submit.prevent="add">
        <label>文档标题<input v-model="form.title" required placeholder="请输入文档标题"/></label>
        <label>知识分类
          <select v-model="form.category" required>
            <option value="" disabled>请选择知识分类</option>
            <option>应知应会</option>
            <option>产研规范</option>
            <option>产品沉淀</option>
            <option>项目沉淀</option>
          </select>
        </label>
        <label>标签<input v-model="form.tags" placeholder="多个标签用逗号分隔"/></label>
        <label>摘要<textarea v-model="form.summary" rows="3" placeholder="请输入文档摘要"/></label>
        <label>正文<textarea v-model="form.content" rows="8" placeholder="请输入文档正文"/></label>
        <div class="form-actions">
          <button type="button" class="secondary" @click="uploadOpen=false">取消</button>
          <button class="primary">保存文档</button>
        </div>
      </form>
    </DetailDrawer>
  </section>
</template>

<style scoped>
.knowledge-base-view {
  max-width: 1400px;
}

.knowledge-home {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Hero 区域 - 渐变背景 */
.knowledge-hero-new {
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%);
  border-radius: 16px;
  padding: 60px 48px;
  color: white;
  text-align: center;
}

.knowledge-hero-new h2 {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.knowledge-hero-new > p {
  font-size: 16px;
  opacity: 0.95;
  margin: 0 0 32px;
}

.hero-search {
  display: flex;
  max-width: 680px;
  margin: 0 auto 20px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
}

.hero-search input {
  flex: 1;
  padding: 14px 20px;
  border: none;
  font-size: 15px;
  outline: none;
  color: var(--text-primary);
}

.hero-search input::placeholder {
  color: var(--text-muted);
}

.search-btn {
  padding: 14px 32px;
  background: #2563eb;
  color: white;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.search-btn:hover {
  background: #1d4ed8;
}

.hot-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 14px;
}

.hot-tags > span {
  opacity: 0.9;
}

.hot-tags button {
  padding: 6px 14px;
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 16px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.hot-tags button:hover {
  background: rgba(255,255,255,0.3);
  border-color: rgba(255,255,255,0.5);
}

/* 分类卡片 */
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.subtitle {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-muted);
}

.category-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.category-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-main);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(37,99,235,0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-icon {
  font-size: 32px;
}

.card-count {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
}

.category-card h4 {
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--text-primary);
}

.category-card > p {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 12px;
  line-height: 1.5;
}

.card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-tags span {
  padding: 4px 10px;
  background: var(--bg-elevated);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-body);
}

/* 最近更新列表 */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-main);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.recent-item:hover {
  border-color: var(--border-strong);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.item-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-elevated);
  border-radius: 8px;
  font-size: 24px;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.item-header h4 {
  font-size: 15px;
  font-weight: 500;
  margin: 0;
  color: var(--text-primary);
}

.fav-btn {
  flex-shrink: 0;
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  transition: color 0.2s;
}

.fav-btn:hover {
  color: #f59e0b;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.item-meta span {
  display: flex;
  align-items: center;
}
</style>
