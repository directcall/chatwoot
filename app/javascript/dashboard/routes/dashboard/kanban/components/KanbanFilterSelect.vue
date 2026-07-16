<script setup>
import { computed, ref } from 'vue';
import { vOnClickOutside } from '@vueuse/components';
import Button from 'dashboard/components-next/button/Button.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';

const props = defineProps({
  options: {
    type: Array,
    default: () => [],
  },
  allLabel: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
});

const modelValue = defineModel({
  type: [String, Number],
  default: null,
});

const isOpen = ref(false);

const selectedLabel = computed(() => {
  return (
    props.options.find(option => option.value === modelValue.value)?.label ||
    props.allLabel
  );
});

const menuItems = computed(() => [
  {
    label: props.allLabel,
    value: null,
    action: 'select',
    icon: props.icon,
    isSelected: modelValue.value === null,
  },
  ...props.options.map(option => ({
    ...option,
    action: 'select',
    isSelected: option.value === modelValue.value,
  })),
]);

const selectItem = item => {
  modelValue.value = item.value;
  isOpen.value = false;
};
</script>

<template>
  <div v-on-click-outside="() => (isOpen = false)" class="relative min-w-0">
    <Button
      type="button"
      :icon="icon"
      :label="selectedLabel"
      slate
      solid
      class="max-w-56 !justify-between"
      :class="{ '!bg-n-alpha-2': isOpen }"
      @click="isOpen = !isOpen"
    >
      <template #default>
        <span class="min-w-0 flex-1 truncate text-start">
          {{ selectedLabel }}
        </span>
        <span class="i-lucide-chevron-down size-4 shrink-0" />
      </template>
    </Button>

    <DropdownMenu
      v-if="isOpen"
      :menu-items="menuItems"
      class="top-full z-50 mt-1 w-64 ltr:left-0 rtl:right-0"
      @action="selectItem"
    >
      <template #trailing-icon="{ item }">
        <span
          v-if="item.isSelected"
          class="i-lucide-check ms-auto size-4 shrink-0"
        />
      </template>
    </DropdownMenu>
  </div>
</template>
