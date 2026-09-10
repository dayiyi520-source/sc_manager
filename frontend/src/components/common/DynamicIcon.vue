<script setup lang="ts">
import { computed } from 'vue';
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  BookOpen,
  Briefcase,
  BarChart3,
  Users,
  TrendingUp,
  Clock,
  Filter,
  Layers,
  ListTodo,
  GitBranch,
  Box,
  Code,
  Bug,
  Database,
  Stamp,
  FolderKanban,
  FolderGit2,
  Settings2,
  Settings,
  Edit,
  Boxes,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-vue-next';

const props = defineProps<{
  name: string;
  size?: number;
  class?: string;
}>();

const iconMap: Record<string, any> = {
  LayoutDashboard,
  CheckSquare,
  Target,
  BookOpen,
  Briefcase,
  BarChart3,
  Users,
  TrendingUp,
  Clock,
  Filter,
  Layers,
  ListTodo,
  GitBranch,
  Box,
  Code,
  Bug,
  Database,
  Stamp,
  FolderKanban,
  FolderGit2,
  Settings2,
  Settings,
  Edit,
  Boxes,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen
};

const IconComponent = computed(() => iconMap[props.name] || Box);
</script>

<template>
  <component :is="IconComponent" :size="size || 16" :class="props.class" />
</template>
