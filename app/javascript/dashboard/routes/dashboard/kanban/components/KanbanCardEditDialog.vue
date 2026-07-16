<script setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { vOnClickOutside } from '@vueuse/components';
import { useAlert } from 'dashboard/composables';
import Button from 'dashboard/components-next/button/Button.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu.vue';
import Editor from 'dashboard/components-next/Editor/Editor.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import AddLabel from 'dashboard/components-next/label/AddLabel.vue';
import Label from 'dashboard/components-next/label/Label.vue';
import MultiSelect from 'dashboard/components-next/filter/inputs/MultiSelect.vue';
import {
  CARD_PRIORITIES,
  cardConversationLabels,
  cardMetadata,
  cardTitle,
  columnDotClass,
  combineDatetimeValue,
  defaultCardTitle,
  priorityOption,
  resolveCardLabels,
  splitDatetimeValue,
} from '../cardHelpers';

const props = defineProps({
  card: {
    type: Object,
    default: null,
  },
  boardName: {
    type: String,
    default: '',
  },
  columns: {
    type: Array,
    default: () => [],
  },
  agents: {
    type: Array,
    default: () => [],
  },
  accountLabels: {
    type: Array,
    default: () => [],
  },
  currentUserId: {
    type: Number,
    default: null,
  },
  currency: {
    type: String,
    default: 'BRL',
  },
  catalogProducts: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['save', 'delete', 'close']);

const { t } = useI18n();
const dialogRef = ref(null);
const openMenu = ref(null);
const openSections = ref({
  title: true,
  description: true,
  opportunity: true,
  relationships: true,
  schedule: true,
  customAttributes: false,
});

const form = ref({
  title: '',
  description: '',
  priority: 'none',
  completed: false,
  amount: '',
  products: [],
  labels: [],
  agents: [],
  startsAtDate: '',
  startsAtTime: '',
  dueAtDate: '',
  dueAtTime: '',
  kanbanColumnId: null,
});

const DESCRIPTION_MAX_LENGTH = 5000;

const modalTitle = computed(() =>
  t('KANBAN.CARD.EDIT_MODAL_TITLE', { board: props.boardName || '' })
);

const agentOptions = computed(() =>
  props.agents.map(agent => ({ id: agent.id, name: agent.name }))
);

const currentColumn = computed(() =>
  props.columns.find(
    column => Number(column.id) === Number(form.value.kanbanColumnId)
  )
);

const currentPriority = computed(() => priorityOption(form.value.priority));

const selectedLabels = computed(() =>
  resolveCardLabels(form.value.labels, props.accountLabels)
);

const labelMenuItems = computed(() =>
  props.accountLabels.map(label => ({
    label: label.title,
    value: label.title,
    action: 'toggle-label',
    thumbnail: { name: label.title, color: label.color },
    isSelected: form.value.labels.includes(label.title),
  }))
);

const contactTag = computed(() => ({
  label: props.card?.contact?.name || t('KANBAN.CARD.UNKNOWN_CONTACT'),
  value: props.card?.contact?.id,
}));

const conversationTag = computed(() => ({
  label: `#${props.card?.conversationDisplayId} - ${props.card?.contact?.name || t('KANBAN.CARD.UNKNOWN_CONTACT')}`,
  value: props.card?.conversationDisplayId,
}));

const statusMenuItems = computed(() =>
  props.columns.map(column => ({
    label: column.name,
    value: column.id,
    action: 'select-status',
    isSelected: Number(column.id) === Number(form.value.kanbanColumnId),
    leadingClass: columnDotClass(column),
  }))
);

const priorityMenuItems = computed(() =>
  CARD_PRIORITIES.map(option => ({
    label: t(`KANBAN.CARD.PRIORITY.${option.value.toUpperCase()}`),
    value: option.value,
    action: 'select-priority',
    icon: option.icon,
    isSelected: option.value === form.value.priority,
  }))
);

const currencyLabel = computed(() =>
  t(`KANBAN.CARD.OPPORTUNITY.AMOUNT_${props.currency || 'BRL'}`)
);

const hydrateForm = () => {
  if (!props.card) return;

  const metadata = cardMetadata(props.card);
  const startsAt = splitDatetimeValue(metadata.startsAt);
  const dueAt = splitDatetimeValue(metadata.dueAt);

  form.value = {
    title:
      metadata.title?.trim() ||
      defaultCardTitle({
        conversationDisplayId: props.card.conversationDisplayId,
        contactName: props.card.contact?.name,
      }),
    description: metadata.description || '',
    priority: metadata.priority || 'none',
    completed: Boolean(metadata.completed),
    amount:
      metadata.amount === 0 || metadata.amount
        ? String(metadata.amount)
        : '',
    products: Array.isArray(metadata.products)
      ? metadata.products.map(product => ({ ...product }))
      : [],
    labels: [...cardConversationLabels(props.card)],
    agents: agentOptions.value.filter(agent =>
      metadata.agentIds.includes(agent.id)
    ),
    startsAtDate: startsAt.date,
    startsAtTime: startsAt.time,
    dueAtDate: dueAt.date,
    dueAtTime: dueAt.time,
    kanbanColumnId: props.card.kanbanColumnId,
  };
};

const toggleSection = section => {
  openSections.value[section] = !openSections.value[section];
};

const closeMenus = () => {
  openMenu.value = null;
};

const toggleMenu = menu => {
  openMenu.value = openMenu.value === menu ? null : menu;
};

const copyCardId = async () => {
  if (!props.card) return;
  try {
    await navigator.clipboard.writeText(String(props.card.id));
    useAlert(t('KANBAN.CARD.ID_COPIED'));
  } catch {
    useAlert(t('KANBAN.CARD.ID_COPY_ERROR'));
  }
};

const assignToMe = () => {
  if (!props.currentUserId) return;
  const currentAgent = agentOptions.value.find(
    agent => Number(agent.id) === Number(props.currentUserId)
  );
  if (!currentAgent) return;
  if (form.value.agents.some(agent => agent.id === currentAgent.id)) return;
  form.value.agents = [...form.value.agents, currentAgent];
};

const toggleLabel = item => {
  if (form.value.labels.includes(item.value)) {
    form.value.labels = form.value.labels.filter(label => label !== item.value);
    return;
  }
  form.value.labels = [...form.value.labels, item.value];
};

const removeLabel = title => {
  form.value.labels = form.value.labels.filter(label => label !== title);
};

const addProduct = () => {
  const nextProduct = props.catalogProducts.find(
    product =>
      !form.value.products.some(
        selected => String(selected.id) === String(product.id)
      )
  );

  form.value.products.push({
    id: nextProduct?.id || `${Date.now()}`,
    name: nextProduct?.name || '',
    price: nextProduct?.price || 0,
  });
};

const removeProduct = productId => {
  form.value.products = form.value.products.filter(
    product => String(product.id) !== String(productId)
  );
};

const selectStatus = item => {
  form.value.kanbanColumnId = item.value;
  closeMenus();
};

const selectPriority = item => {
  form.value.priority = item.value;
  closeMenus();
};

const toggleCompleted = () => {
  form.value.completed = !form.value.completed;
};

const open = () => {
  hydrateForm();
  closeMenus();
  dialogRef.value?.open();
};

const close = () => {
  closeMenus();
  dialogRef.value?.close();
  emit('close');
};

const save = () => {
  if (!props.card) return;

  emit('save', {
    card: props.card,
    kanbanColumnId: form.value.kanbanColumnId,
    labels: form.value.labels,
    metadata: {
      ...cardMetadata(props.card),
      title: form.value.title.trim() || cardTitle(props.card),
      description: form.value.description.slice(0, DESCRIPTION_MAX_LENGTH),
      priority: form.value.priority,
      completed: form.value.completed,
      amount: Number(form.value.amount) || 0,
      products: form.value.products
        .filter(product => product.name?.trim())
        .map(product => ({
          id: product.id,
          name: product.name.trim(),
          price: Number(product.price) || 0,
        })),
      agentIds: form.value.agents.map(agent => agent.id),
      startsAt: combineDatetimeValue(
        form.value.startsAtDate,
        form.value.startsAtTime
      ),
      dueAt: combineDatetimeValue(form.value.dueAtDate, form.value.dueAtTime),
    },
  });
};

watch(
  () => props.card?.id,
  () => {
    if (props.card) hydrateForm();
  }
);

defineExpose({ open, close });
</script>

<template>
  <Dialog
    ref="dialogRef"
    width="2xl"
    position="top"
    overflow-y-auto
    :show-cancel-button="false"
    :show-confirm-button="false"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-3">
      <div class="flex items-start justify-between gap-3">
        <h3 class="text-base font-medium leading-6 text-n-slate-12">
          {{ modalTitle }}
        </h3>
        <div class="flex shrink-0 items-center gap-2 text-sm text-n-slate-11">
          <span>{{ $t('KANBAN.CARD.ID_LABEL', { id: card?.id }) }}</span>
          <button
            type="button"
            class="grid size-6 place-items-center rounded-md text-n-slate-11 hover:bg-n-alpha-2"
            @click="copyCardId"
          >
            <span class="i-lucide-copy size-3.5" />
          </button>
        </div>
      </div>

      <section class="rounded-xl border border-n-weak bg-n-solid-1">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-n-slate-12"
          @click="toggleSection('title')"
        >
          <span>{{ $t('KANBAN.CARD.FIELDS.TITLE') }}</span>
          <span
            class="size-4"
            :class="
              openSections.title
                ? 'i-lucide-chevron-up'
                : 'i-lucide-chevron-down'
            "
          />
        </button>
        <div v-if="openSections.title" class="border-t border-n-weak px-4 py-3">
          <Input v-model="form.title" />
        </div>
      </section>

      <section class="rounded-xl border border-n-weak bg-n-solid-1">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-n-slate-12"
          @click="toggleSection('description')"
        >
          <span>{{ $t('KANBAN.CARD.FIELDS.DESCRIPTION') }}</span>
          <span
            class="size-4"
            :class="
              openSections.description
                ? 'i-lucide-chevron-up'
                : 'i-lucide-chevron-down'
            "
          />
        </button>
        <div
          v-if="openSections.description"
          class="border-t border-n-weak px-4 py-3"
        >
          <Editor
            v-model="form.description"
            :editor-key="`kanban-card-${card?.id || 'new'}`"
            :max-length="DESCRIPTION_MAX_LENGTH"
            :show-character-count="true"
            :enable-canned-responses="false"
            :enable-variables="false"
            :placeholder="$t('KANBAN.CARD.FIELDS.DESCRIPTION_PLACEHOLDER')"
          />
        </div>
      </section>

      <section class="rounded-xl border border-n-weak bg-n-solid-1">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-n-slate-12"
          @click="toggleSection('opportunity')"
        >
          <span>{{ $t('KANBAN.CARD.OPPORTUNITY.TITLE') }}</span>
          <span
            class="size-4"
            :class="
              openSections.opportunity
                ? 'i-lucide-chevron-up'
                : 'i-lucide-chevron-down'
            "
          />
        </button>
        <div
          v-if="openSections.opportunity"
          class="flex flex-col gap-4 border-t border-n-weak px-4 py-3"
        >
          <Input
            v-model="form.amount"
            type="number"
            :label="currencyLabel"
            placeholder="0,00"
          />
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium text-n-slate-12">
                {{ $t('KANBAN.CARD.OPPORTUNITY.PRODUCTS') }}
              </p>
              <Button
                type="button"
                icon="i-lucide-plus"
                :label="$t('KANBAN.CARD.OPPORTUNITY.ADD_PRODUCT')"
                ghost
                sm
                blue
                @click="addProduct"
              />
            </div>
            <div
              v-for="product in form.products"
              :key="product.id"
              class="flex items-center gap-2"
            >
              <Input
                v-model="product.name"
                class="flex-1"
                :placeholder="$t('KANBAN.SETTINGS.PRODUCTS.NAME')"
              />
              <Input
                v-model="product.price"
                type="number"
                class="w-28"
                :placeholder="$t('KANBAN.SETTINGS.PRODUCTS.PRICE')"
              />
              <Button
                type="button"
                icon="i-lucide-trash-2"
                ghost
                slate
                xs
                class="!size-8 !p-0"
                @click="removeProduct(product.id)"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-n-weak bg-n-solid-1">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-n-slate-12"
          @click="toggleSection('relationships')"
        >
          <span>{{ $t('KANBAN.CARD.RELATIONSHIPS.TITLE') }}</span>
          <span
            class="size-4"
            :class="
              openSections.relationships
                ? 'i-lucide-chevron-up'
                : 'i-lucide-chevron-down'
            "
          />
        </button>
        <div
          v-if="openSections.relationships"
          class="flex flex-col gap-4 border-t border-n-weak px-4 py-3"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium text-n-slate-12">
                {{ $t('KANBAN.CARD.RELATIONSHIPS.AGENTS') }}
              </p>
              <button
                type="button"
                class="text-sm font-medium text-n-brand hover:underline"
                @click="assignToMe"
              >
                {{ $t('KANBAN.CARD.RELATIONSHIPS.ASSIGN_TO_ME') }}
              </button>
            </div>
            <div class="min-h-11 rounded-lg bg-n-solid-2 p-2">
              <MultiSelect
                v-model="form.agents"
                :options="agentOptions"
                :max-chips="20"
              />
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-n-slate-12">
              {{ $t('KANBAN.CARD.RELATIONSHIPS.LABELS') }}
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <div
                v-for="label in selectedLabels"
                :key="label.title"
                class="inline-flex items-center gap-1"
              >
                <Label :label="label" compact />
                <button
                  type="button"
                  class="grid size-5 place-items-center rounded-full text-n-slate-10 hover:bg-n-alpha-2 hover:text-n-slate-12"
                  @click="removeLabel(label.title)"
                >
                  <span class="i-lucide-x size-3" />
                </button>
              </div>
              <AddLabel
                :label-menu-items="labelMenuItems"
                @update-label="toggleLabel"
              />
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-n-slate-12">
              {{ $t('KANBAN.CARD.RELATIONSHIPS.CONTACTS') }}
            </p>
            <span
              class="inline-flex items-center gap-1 rounded-md bg-n-slate-3 px-2 py-1 text-sm text-n-slate-12"
            >
              {{ contactTag.label }}
            </span>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium text-n-slate-12">
              {{ $t('KANBAN.CARD.RELATIONSHIPS.CONVERSATIONS') }}
            </p>
            <span
              class="inline-flex items-center gap-1 rounded-md bg-n-slate-3 px-2 py-1 text-sm text-n-slate-12"
            >
              {{ conversationTag.label }}
            </span>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-n-weak bg-n-solid-1">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-n-slate-12"
          @click="toggleSection('schedule')"
        >
          <span>{{ $t('KANBAN.CARD.SCHEDULE.TITLE') }}</span>
          <span
            class="size-4"
            :class="
              openSections.schedule
                ? 'i-lucide-chevron-up'
                : 'i-lucide-chevron-down'
            "
          />
        </button>
        <div
          v-if="openSections.schedule"
          class="grid gap-4 border-t border-n-weak px-4 py-3 md:grid-cols-2"
        >
          <div class="space-y-2">
            <p class="text-sm font-medium text-n-slate-12">
              {{ $t('KANBAN.CARD.SCHEDULE.START') }}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="form.startsAtDate"
                type="date"
                class="h-10 rounded-lg border border-n-weak bg-n-alpha-black2 px-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
              />
              <input
                v-model="form.startsAtTime"
                type="time"
                class="h-10 rounded-lg border border-n-weak bg-n-alpha-black2 px-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
              />
            </div>
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium text-n-slate-12">
              {{ $t('KANBAN.CARD.SCHEDULE.DUE') }}
            </p>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="form.dueAtDate"
                type="date"
                class="h-10 rounded-lg border border-n-weak bg-n-alpha-black2 px-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
              />
              <input
                v-model="form.dueAtTime"
                type="time"
                class="h-10 rounded-lg border border-n-weak bg-n-alpha-black2 px-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-n-weak bg-n-solid-1">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-n-slate-12"
          @click="toggleSection('customAttributes')"
        >
          <span>{{ $t('KANBAN.CARD.CUSTOM_ATTRIBUTES.TITLE') }}</span>
          <span
            class="size-4"
            :class="
              openSections.customAttributes
                ? 'i-lucide-chevron-up'
                : 'i-lucide-chevron-down'
            "
          />
        </button>
        <div
          v-if="openSections.customAttributes"
          class="border-t border-n-weak px-4 py-3 text-sm text-n-slate-11"
        >
          {{ $t('KANBAN.CARD.CUSTOM_ATTRIBUTES.EMPTY') }}
        </div>
      </section>
    </div>

    <template #footer>
      <div
        v-on-click-outside="closeMenus"
        class="flex w-full flex-wrap items-center justify-between gap-3"
      >
        <div class="relative flex flex-wrap items-center gap-2">
          <Button
            type="button"
            :label="$t('KANBAN.CARD.DELETE')"
            ghost
            ruby
            sm
            @click="emit('delete', card)"
          />

          <button
            type="button"
            class="inline-flex h-8 items-center gap-2 rounded-lg border border-n-weak px-2.5 text-sm text-n-slate-12 hover:bg-n-alpha-2"
            @click="toggleMenu('status')"
          >
            <span
              class="size-2.5 rounded-full"
              :class="columnDotClass(currentColumn)"
            />
            <span>{{ currentColumn?.name || $t('KANBAN.CARD.STATUS') }}</span>
          </button>

          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg border border-n-weak hover:bg-n-alpha-2"
            :class="form.completed ? 'text-n-teal-11' : 'text-n-slate-10'"
            @click="toggleCompleted"
          >
            <span class="i-lucide-check size-4" />
          </button>

          <button
            type="button"
            class="inline-flex h-8 items-center gap-2 rounded-lg border border-n-weak px-2.5 text-sm hover:bg-n-alpha-2"
            :class="currentPriority.colorClass"
            @click="toggleMenu('priority')"
          >
            <span :class="[currentPriority.icon, 'size-4']" />
            <span>
              {{
                $t(
                  `KANBAN.CARD.PRIORITY.${String(form.priority).toUpperCase()}`
                )
              }}
            </span>
          </button>

          <DropdownMenu
            v-if="openMenu === 'status'"
            :menu-items="statusMenuItems"
            class="bottom-full z-50 mb-1 w-56 ltr:left-0 rtl:right-0"
            @action="selectStatus"
          >
            <template #icon="{ item }">
              <span
                class="size-2.5 shrink-0 rounded-full"
                :class="item.leadingClass"
              />
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
            class="bottom-full z-50 mb-1 w-48 ltr:left-8 rtl:right-8"
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

        <div class="flex items-center gap-2">
          <Button
            type="button"
            :label="$t('KANBAN.CARD.CANCEL')"
            ghost
            slate
            sm
            @click="close"
          />
          <Button
            type="button"
            :label="$t('KANBAN.CARD.UPDATE')"
            blue
            sm
            :is-loading="isLoading"
            @click="save"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>
