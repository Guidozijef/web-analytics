<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  value: number | string;
  subTitle?: string;
  type?: 'primary' | 'success' | 'warning' | 'danger';
}>();

const formatValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toLocaleString();
  }
  return props.value;
});

const accentGradient = computed(() => {
  switch (props.type) {
    case 'success':
      return 'from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/20';
    case 'warning':
      return 'from-amber-500/20 to-orange-500/5 text-amber-400 border-amber-500/20';
    case 'danger':
      return 'from-rose-500/20 to-red-500/5 text-rose-400 border-rose-500/20';
    default:
      return 'from-indigo-500/20 to-blue-500/5 text-indigo-400 border-indigo-500/20';
  }
});
</script>

<template>
  <div class="glass-panel glass-panel-hover p-5 relative overflow-hidden group">
    <div :class="['absolute -top-12 -right-12 w-24 h-24 rounded-full bg-gradient-to-br blur-xl opacity-50 transition-all group-hover:opacity-100', accentGradient]"></div>
    
    <div class="flex items-center justify-between mb-3 relative z-10">
      <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">{{ props.title }}</span>
      <div class="p-2 rounded-lg bg-slate-800/80 text-slate-300">
        <slot name="icon" />
      </div>
    </div>

    <div class="relative z-10">
      <div class="text-3xl font-bold text-slate-50 tracking-tight mb-1">
        {{ formatValue }}
      </div>
      <p v-if="props.subTitle" class="text-xs text-slate-400">
        {{ props.subTitle }}
      </p>
    </div>
  </div>
</template>

<style scoped>
</style>
