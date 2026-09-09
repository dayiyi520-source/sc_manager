<script setup lang="ts">defineProps<{steps:string[];active:number}>();</script>
<template><ol class="timeline-steps"><li v-for="(step,index) in steps" :key="step" :class="{active:index<=active}"><span>{{index+1}}</span>{{step}}</li></ol></template>
