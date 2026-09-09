<script setup lang="ts">
import ActivityPanel from '../common/ActivityPanel.vue'; import {requirementRepository} from '../../services/requirementRepository';
defineProps<{requirementId:string}>();
</script>
<template><ActivityPanel :entity-id="requirementId" :load-events="requirementRepository.events" :submit-comment="(id,content)=>requirementRepository.comment(id,{content})"/></template>
