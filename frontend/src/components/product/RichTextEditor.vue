<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon
} from 'lucide-vue-next';

interface Props {
  modelValue?: string;
  htmlValue?: string;
  placeholder?: string;
}

interface Emits {
  (e: 'update:modelValue', text: string): void;
  (e: 'update:htmlValue', html: string): void;
  (e: 'blur'): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  htmlValue: '',
  placeholder: '请输入内容，支持文字排版、列表和链接...'
});

const emit = defineEmits<Emits>();

const editor = ref<HTMLDivElement | null>(null);
const linkUrl = ref('');

// 初始化内容
onMounted(() => {
  if (editor.value && (props.htmlValue || props.modelValue)) {
    editor.value.innerHTML = props.htmlValue || props.modelValue.replace(/\n/g, '<br>');
  }
});

// 监听外部变化
watch([() => props.htmlValue, () => props.modelValue], () => {
  if (!editor.value) return;
  const next = props.htmlValue || props.modelValue;
  if (next && editor.value.innerHTML !== next && document.activeElement !== editor.value) {
    editor.value.innerHTML = props.htmlValue || props.modelValue.replace(/\n/g, '<br>');
  }
});

// 发射变更
function emitInput() {
  if (!editor.value) return;
  const text = editor.value.innerText || '';
  const html = editor.value.innerHTML || '';
  emit('update:modelValue', text);
  emit('update:htmlValue', html);
}

// 执行命令
function command(name: string, value?: string) {
  editor.value?.focus();
  document.execCommand(name, false, value);
  emitInput();
}

// 工具栏按钮配置
const buttons = [
  { label: '撤销', icon: Undo2, command: 'undo' },
  { label: '重做', icon: Redo2, command: 'redo' },
  { label: '粗体', icon: Bold, command: 'bold' },
  { label: '斜体', icon: Italic, command: 'italic' },
  { label: '下划线', icon: Underline, command: 'underline' },
  { label: '删除线', icon: Strikethrough, command: 'strikeThrough' },
  { label: '项目符号', icon: List, command: 'insertUnorderedList' },
  { label: '编号列表', icon: ListOrdered, command: 'insertOrderedList' },
  { label: '左对齐', icon: AlignLeft, command: 'justifyLeft' },
  { label: '居中', icon: AlignCenter, command: 'justifyCenter' },
  { label: '右对齐', icon: AlignRight, command: 'justifyRight' }
];

// 插入链接
function insertLink() {
  if (!linkUrl.value.trim()) return;
  command('createLink', linkUrl.value.trim());
  linkUrl.value = '';
}

// 处理粘贴图片
function handlePaste(event: ClipboardEvent) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find(item => item.type.startsWith('image/'));
  
  if (!imageItem) return;
  
  event.preventDefault();
  const file = imageItem.getAsFile();
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = () => {
    command('insertImage', String(reader.result));
  };
  reader.readAsDataURL(file);
}
</script>

<template>
  <div class="rich-text-editor">
    <div class="toolbar">
      <button
        v-for="btn in buttons"
        :key="btn.label"
        type="button"
        :title="btn.label"
        :aria-label="btn.label"
        class="toolbar-btn"
        @mousedown.prevent
        @click="command(btn.command)"
      >
        <component :is="btn.icon" :size="16" />
      </button>
      
      <div class="link-input-group">
        <LinkIcon :size="14" class="link-icon" />
        <input
          v-model="linkUrl"
          type="text"
          placeholder="https://"
          aria-label="链接地址"
          class="link-input"
        />
        <button
          type="button"
          class="link-insert-btn"
          :disabled="!linkUrl.trim()"
          @mousedown.prevent
          @click="insertLink"
        >
          插入
        </button>
      </div>
    </div>
    
    <div
      ref="editor"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      class="editor-content"
      :data-placeholder="placeholder"
      @input="emitInput"
      @blur="emit('blur')"
      @paste="handlePaste"
    />
  </div>
</template>

<style scoped>
.rich-text-editor {
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--border-main);
  background: var(--bg-card);
}

.rich-text-editor:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border-main);
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.toolbar-btn:hover {
  background: var(--bg-surface-soft);
  color: var(--text-primary);
}

.link-input-group {
  display: flex;
  align-items: center;
  margin-left: 4px;
  border: 1px solid var(--border-main);
  border-radius: 4px;
  overflow: hidden;
}

.link-icon {
  margin-left: 8px;
  color: var(--text-muted);
}

.link-input {
  width: 112px;
  height: 28px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.link-insert-btn {
  height: 28px;
  padding: 0 8px;
  border: none;
  border-left: 1px solid var(--border-main);
  background: transparent;
  color: var(--active-text);
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.link-insert-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.editor-content {
  min-height: 320px;
  padding: 16px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  outline: none;
}

.editor-content:empty::before {
  content: attr(data-placeholder);
  color: var(--text-muted);
  pointer-events: none;
}
</style>
