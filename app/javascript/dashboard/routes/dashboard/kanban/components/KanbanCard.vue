<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { vOnClickOutside } from '@vueuse/components';
import { useMapGetter } from 'dashboard/composables/store';
import Avatar from 'dashboard/components-next/avatar/Avatar.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Label from 'dashboard/components-next/label/Label.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';
import {
  CARD_PRIORITIES,
  cardConversationLabels,
  cardDescriptionPreview,
  cardDescriptionText,
  cardHasLongDescription,
  cardMetadata,
  cardTitle,
  columnDotClass,
  formatCurrency,
  formatDueDateLabel,
  getNextColumn,
  isDueDateOverdue,
  priorityOption,
  relativeAgeLabel,
  resolveCardLabels,
} from '../cardHelpers';

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
  columns: {
    type: Array,
    default: () => [],
  },
  currency: {
    type: String,
    default: 'BRL',
  },
  canManage: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'delete',
  'duplicate',
  'edit',
  'move',
  'update-metadata',
]);

const { t } = useI18n();
const accountLabels = useMapGetter('labels/getLabels');

const openMenu = ref(null);
const showFullDescription = ref(false);
const pointerStart = ref(null);

const DRAG_THRESHOLD = 5;

const metadata = computed(() => cardMetadata(props.card));
const title = computed(() => cardTitle(props.card));
const descriptionText = computed(() => cardDescriptionText(metadata.value.description));
const descriptionPreview = computed(() =>
  showFullDescription.value
    ? descriptionText.value
    : cardDescriptionPreview(metadata.value.description)
);
const hasLongDescription = computed(() =>
  cardHasLongDescription(metadata.value.description)
);
const ageLabel = computed(() =>
  relativeAgeLabel(props.card.createdAt || props.card.lastActivityAt)
);
const amountLabel = computed(() =>
  formatCurrency(metadata.value.amount, props.currency)
);
const dueDateLabel = computed(() => formatDueDateLabel(metadata.value.dueAt));
const isOverdue = computed(() => isDueDateOverdue(metadata.value.dueAt));
const currentPriority = computed(() => priorityOption(metadata.value.priority));
const currentColumn = computed(() =>
  props.columns.find(
    column => Number(column.id) === Number(props.card.kanbanColumnId)
  )
);
const nextColumn = computed(() =>
  getNextColumn(props.columns, props.card.kanbanColumnId)
);
const statusDotClass = computed(() => columnDotClass(currentColumn.value));
const cardLabels = computed(() =>
  resolveCardLabels(cardConversationLabels(props.card), accountLabels.value)
);

const inboxForAvatar = computed(() => {
  if (!props.card.inbox) return null;
  const channelType =
    props.card.inbox.channelType || props.card.inbox.channel_type;
  return {
    ...props.card.inbox,
    channelType,
    channel_type: channelType,
    medium: props.card.inbox.medium,
  };
});

const statusMenuItems = computed(() =>
  props.columns.map(column => ({
    label: column.name,
    value: column.id,
    action: 'select-status',
    isSelected: Number(column.id) === Number(props.card.kanbanColumnId),
    leadingClass: columnDotClass(column),
  }))
);

const priorityMenuItems = computed(() =>
  CARD_PRIORITIES.map(option => ({
    label: t(`KANBAN.CARD.PRIORITY.${option.value.toUpperCase()}`),
    value: option.value,
    action: 'select-priority',
    icon: option.icon,
    isSelected: option.value === metadata.value.priority,
  }))
);

const closeMenus = () => {
  openMenu.value = null;
};

const toggleMenu = (menu, event) => {
  event?.stopPropagation();
  openMenu.value = openMenu.value === menu ? null : menu;
};

const toggleDescription = event => {
  event?.stopPropagation();
  showFullDescription.value = !showFullDescription.value;
};

const selectStatus = item => {
  closeMenus();
  if (Number(item.value) === Number(props.card.kanbanColumnId)) return;
  emit('move', {
    cardId: props.card.id,
    columnId: item.value,
  });
};

const selectPriority = item => {
  closeMenus();
  emit('update-metadata', {
    card: props.card,
    metadata: {
      ...metadata.value,
      priority: item.value,
    },
  });
};

const toggleCompleted = event => {
  event?.stopPropagation();
  emit('update-metadata', {
    card: props.card,
    metadata: {
      ...metadata.value,
      completed: !metadata.value.completed,
    },
  });
};

const moveToNextStage = event => {
  event?.stopPropagation();
  if (!nextColumn.value) return;
  emit('move', {
    cardId: props.card.id,
    columnId: nextColumn.value.id,
  });
};

const onPointerDown = event => {
  if (event.target.closest('button')) return;
  pointerStart.value = { x: event.clientX, y: event.clientY };
};

const onCardClick = event => {
  if (event.target.closest('button')) return;
  if (!pointerStart.value) return;

  const moved =
    Math.abs(event.clientX - pointerStart.value.x) > DRAG_THRESHOLD ||
    Math.abs(event.clientY - pointerStart.value.y) > DRAG_THRESHOLD;

  pointerStart.value = null;
  if (moved) return;

  emit('edit', props.card);
};
</script>

<template>
  <div
    v-on-click-outside="closeMenus"
    class="group relative cursor-pointer rounded-lg border border-n-weak bg-n-solid-1 p-3 shadow-sm transition-colors
      hover:border-n-blue-7 hover:bg-n-alpha-2 active:cursor-grabbing"
    @pointerdown="onPointerDown"
    @click="onCardClick"
  >
    <div class="flex items-start justify-between gap-2">
      <p class="min-w-0 flex-1 truncate text-sm font-semibold text-n-slate-12">
        {{ title }}
      </p>
      <div
        v-if="canManage"
        class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Button
          v-tooltip.top="$t('KANBAN.CARD.DELETE')"
          icon="i-lucide-trash-2"
          ghost
          slate
          xs
          class="!size-6 !p-0"
          @click.stop="emit('delete', card)"
        />
        <Button
          v-tooltip.top="$t('KANBAN.CARD.DUPLICATE')"
          icon="i-lucide-copy"
          ghost
          slate
          xs
          class="!size-6 !p-0"
          @click.stop="emit('duplicate', card)"
        />
        <Button
          v-tooltip.top="$t('KANBAN.CARD.EDIT')"
          icon="i-lucide-pencil"
          ghost
          slate
          xs
          class="!size-6 !p-0"
          @click.stop="emit('edit', card)"
        />
      </div>
    </div>

    <div class="mt-3 flex items-center gap-2">
      <div class="relative">
        <Avatar
          :name="card.contact?.name || $t('KANBAN.CARD.UNKNOWN_CONTACT')"
          :src="card.contact?.thumbnail || ''"
          :inbox="inboxForAvatar"
          :size="36"
          rounded-full
        />
        <span
          v-if="metadata.completed"
          class="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-n-teal-9 text-white ring-2 ring-n-solid-1"
        >
          <span class="i-lucide-check size-2.5" />
        </span>
      </div>
    </div>

    <div v-if="descriptionPreview" class="mt-2.5 text-sm leading-5 text-n-slate-11">
      <p :class="{ 'line-clamp-3': !showFullDescription && hasLongDescription }">
        {{ descriptionPreview }}
      </p>
      <button
        v-if="hasLongDescription"
        type="button"
        class="mt-1 text-sm font-medium text-n-brand hover:underline"
        @click="toggleDescription"
      >
        {{
          showFullDescription
            ? $t('KANBAN.CARD.SHOW_LESS')
            : $t('KANBAN.CARD.SHOW_MORE')
        }}
      </button>
    </div>

    <div v-if="cardLabels.length" class="mt-2.5 flex flex-wrap gap-1.5">
      <Label
        v-for="label in cardLabels"
        :key="label.title"
        :label="label"
        compact
      />
    </div>

    <div class="relative mt-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="grid size-6 place-items-center rounded-full text-n-slate-11 transition-colors hover:bg-n-alpha-2"
          :class="currentPriority.colorClass"
          @click="toggleMenu('priority', $event)"
        >
          <span :class="[currentPriority.icon, 'size-4']" />
        </button>

        <button
          type="button"
          class="grid size-6 place-items-center rounded-full transition-colors hover:bg-n-alpha-2"
          @click="toggleMenu('status', $event)"
        >
          <span class="size-2.5 rounded-full" :class="statusDotClass" />
        </button>

        <button
          v-if="nextColumn"
          v-tooltip.top="$t('KANBAN.CARD.MOVE_NEXT', { column: nextColumn.name })"
          type="button"
          class="grid size-6 place-items-center rounded-full text-n-slate-10 transition-colors hover:bg-n-alpha-2 hover:text-n-slate-12"
          @click="moveToNextStage"
        >
          <span class="i-lucide-arrow-right size-4" />
        </button>

        <button
          type="button"
          class="grid size-6 place-items-center rounded-full transition-colors hover:bg-n-alpha-2"
          :class="metadata.completed ? 'text-n-teal-11' : 'text-n-slate-10'"
          @click="toggleCompleted"
        >
          <span class="i-lucide-check size-4" />
        </button>
      </div>

      <div
        v-if="ageLabel"
        class="flex items-center gap-1 text-xs text-n-slate-11"
      >
        <span class="i-lucide-clock size-3.5" />
        <span>{{ ageLabel }}</span>
      </div>

      <DropdownMenu
        v-if="openMenu === 'status'"
        :menu-items="statusMenuItems"
        class="bottom-full z-50 mb-1 w-56 ltr:left-0 rtl:right-0"
        @action="selectStatus"
      >
        <template #icon="{ item }">
          <span class="size-2.5 shrink-0 rounded-full" :class="item.leadingClass" />
        </template>
        <template #trailing-icon="{ item }">
          <span
            v-if="item.isSelected"
            class="i-lucide-check ms-auto size-4 shrink-0"
          />
        </template>
      </DropdownMenu>

      <DropdownMenu
        v-if="openMenu === 'priority'"
        :menu-items="priorityMenuItems"
        class="bottom-full z-50 mb-1 w-48 ltr:left-0 rtl:right-0"
        @action="selectPriority"
      >
        <template #trailing-icon="{ item }">
          <span
            v-if="item.isSelected"
            class="i-lucide-check ms-auto size-4 shrink-0"
          />
        </template>
      </DropdownMenu>
    </div>

    <div
      v-if="amountLabel || dueDateLabel"
      class="mt-2.5 flex flex-wrap items-center gap-2 border-t border-n-weak pt-2.5"
    >
      <span
        v-if="amountLabel"
        class="inline-flex items-center gap-1 text-xs font-medium text-n-slate-11"
      >
        <span class="i-lucide-banknote size-3.5" />
        <span>{{ amountLabel }}</span>
      </span>
      <span
        v-if="dueDateLabel"
        class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
        :class="
          isOverdue
            ? 'bg-n-ruby-3 text-n-ruby-11'
            : 'bg-n-slate-3 text-n-slate-11'
        "
      >
        <span
          class="size-3.5"
          :class="isOverdue ? 'i-lucide-alarm-clock' : 'i-lucide-calendar'"
        />
        <span>{{ dueDateLabel }}</span>
      </span>
    </div>
  </div>
</template>
