<script setup lang="ts">
import RelatedWorkItems from '../common/RelatedWorkItems.vue'; import {requirementRepository} from '../../services/requirementRepository';
defineProps<{requirementId:string}>(); const emit=defineEmits<{open:[item:Record<string,unknown>]}>();
</script>
<template><RelatedWorkItems :entity-id="requirementId" :load-items="async id => {const detail=await requirementRepository.detail(id);return Array.isArray(detail.workItems)?detail.workItems:[]}" :create-item="requirementRepository.createWorkItem" :retry-item="requirementRepository.retryWorkItem" :load-people="requirementRepository.employees" @open="emit('open',$event)"/></template>
