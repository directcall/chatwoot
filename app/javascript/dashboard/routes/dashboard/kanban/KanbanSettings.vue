<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import Draggable from 'vuedraggable';
import { useAlert } from 'dashboard/composables';
import { useMapGetter, useStore } from 'dashboard/composables/store';
import Button from 'dashboard/components-next/button/Button.vue';
import Dialog from 'dashboard/components-next/dialog/Dialog.vue';
import Editor from 'dashboard/components-next/Editor/Editor.vue';
import MultiSelect from 'dashboard/components-next/filter/inputs/MultiSelect.vue';
import Select from 'dashboard/components-next/select/Select.vue';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';
import { KANBAN_COLUMN_COLORS } from './columnColors';

const store = useStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const boards = useMapGetter('kanban/getBoards');
const columns = useMapGetter('kanban/getColumns');
const agents = useMapGetter('agents/getAgents');
const inboxes = useMapGetter('inboxes/getInboxes');
const uiFlags = useMapGetter('kanban/getUIFlags');

const boardId = computed(() => Number(route.params.boardId));
const board = computed(() =>
  boards.value.find(item => item.id === boardId.value)
);
const isLoading = computed(
  () => uiFlags.value.isFetchingBoards || uiFlags.value.isFetchingColumns
);

const boardName = ref('');
const boardDescription = ref('');
const currency = ref('BRL');
const selectedAgents = ref([]);
const selectedInboxes = ref([]);
const products = ref([]);
const productDrafts = ref([]);
const localColumns = ref([]);
const editingColumn = ref(null);
const columnName = ref('');
const columnDescription = ref('');
const columnColor = ref('blue');
const columnProbability = ref('100');
const columnOutcome = ref('open');
const columnDialogRef = ref(null);
const productsDialogRef = ref(null);

const agentOptions = computed(() =>
  agents.value.map(agent => ({ id: agent.id, name: agent.name }))
);
const inboxOptions = computed(() =>
  inboxes.value.map(inbox => ({ id: inbox.id, name: inbox.name }))
);
const currencyOptions = computed(() => [
  { value: 'BRL', label: t('KANBAN.SETTINGS.CURRENCY.BRL') },
  { value: 'USD', label: t('KANBAN.SETTINGS.CURRENCY.USD') },
  { value: 'EUR', label: t('KANBAN.SETTINGS.CURRENCY.EUR') },
]);
const outcomeOptions = computed(() => [
  { value: 'open', label: t('KANBAN.SETTINGS.STAGES.OUTCOME_OPEN') },
  { value: 'won', label: t('KANBAN.SETTINGS.STAGES.OUTCOME_WON') },
  { value: 'lost', label: t('KANBAN.SETTINGS.STAGES.OUTCOME_LOST') },
]);

const colorClass = color =>
  KANBAN_COLUMN_COLORS.find(option => option.value === color)?.class ||
  KANBAN_COLUMN_COLORS[0].class;

const hydrateForm = () => {
  if (!board.value) return;

  const settings = board.value.settings || {};
  boardName.value = board.value.name || '';
  boardDescription.value = board.value.description || '';
  currency.value = settings.currency || 'BRL';
  selectedAgents.value = agentOptions.value.filter(agent =>
    (settings.agentIds || []).includes(agent.id)
  );
  selectedInboxes.value = inboxOptions.value.filter(inbox =>
    (settings.inboxIds || []).includes(inbox.id)
  );
  products.value = (settings.products || []).map(product => ({ ...product }));
  localColumns.value = [...columns.value].sort(
    (first, second) => first.position - second.position
  );
};

const goBack = () => {
  router.push({
    name: 'kanban_dashboard_index',
    params: { accountId: route.params.accountId },
  });
};

const copyBoardId = () => {
  navigator.clipboard?.writeText(String(boardId.value));
  useAlert(t('KANBAN.SETTINGS.ID_COPIED'));
};

const saveBoard = async () => {
  const name = boardName.value.trim();
  if (!name) return;

  try {
    await store.dispatch('kanban/updateBoard', {
      id: boardId.value,
      name,
      description: boardDescription.value,
      settings: {
        currency: currency.value,
        agentIds: selectedAgents.value.map(agent => agent.id),
        inboxIds: selectedInboxes.value.map(inbox => inbox.id),
        products: products.value,
      },
    });
    useAlert(t('KANBAN.SETTINGS.SAVE_SUCCESS'));
  } catch (error) {
    useAlert(error?.message || t('KANBAN.SETTINGS.SAVE_ERROR'));
  }
};

const resetColumnForm = () => {
  editingColumn.value = null;
  columnName.value = '';
  columnDescription.value = '';
  columnColor.value = 'blue';
  columnProbability.value = '100';
  columnOutcome.value = 'open';
};

const openCreateColumn = () => {
  resetColumnForm();
  columnDialogRef.value?.open();
};

const openEditColumn = column => {
  editingColumn.value = column;
  columnName.value = column.name || '';
  columnDescription.value = column.description || '';
  columnColor.value = column.color || 'blue';
  columnProbability.value = String(column.winProbability ?? 100);
  columnOutcome.value = column.outcome || 'open';
  columnDialogRef.value?.open();
};

const saveColumn = async () => {
  const name = columnName.value.trim();
  if (!name) return;

  const column = {
    name,
    description: columnDescription.value.trim(),
    color: columnColor.value,
    winProbability: Math.min(100, Math.max(0, Number(columnProbability.value))),
    outcome: columnOutcome.value,
  };

  try {
    if (editingColumn.value) {
      await store.dispatch('kanban/updateColumn', {
        boardId: boardId.value,
        columnId: editingColumn.value.id,
        column,
      });
    } else {
      await store.dispatch('kanban/createColumn', {
        boardId: boardId.value,
        column: {
          ...column,
          position: (localColumns.value.length + 1) * 10,
        },
      });
    }

    await store.dispatch('kanban/getColumns', boardId.value);
    localColumns.value = [...columns.value];
    columnDialogRef.value?.close();
    useAlert(t('KANBAN.SETTINGS.STAGES.SAVE_SUCCESS'));
  } catch (error) {
    useAlert(error?.message || t('KANBAN.SETTINGS.STAGES.SAVE_ERROR'));
  }
};

const deleteColumn = async () => {
  if (
    !editingColumn.value ||
    !window.confirm(t('KANBAN.COLUMN.DELETE_CONFIRM'))
  ) {
    return;
  }

  try {
    await store.dispatch('kanban/deleteColumn', {
      boardId: boardId.value,
      columnId: editingColumn.value.id,
    });
    localColumns.value = localColumns.value.filter(
      column => column.id !== editingColumn.value.id
    );
    columnDialogRef.value?.close();
    useAlert(t('KANBAN.COLUMN.DELETE_SUCCESS'));
  } catch (error) {
    useAlert(error?.message || t('KANBAN.COLUMN.DELETE_ERROR'));
  }
};

const reorderColumns = async () => {
  try {
    await Promise.all(
      localColumns.value.map((column, index) =>
        store.dispatch('kanban/updateColumn', {
          boardId: boardId.value,
          columnId: column.id,
          column: { position: (index + 1) * 10 },
        })
      )
    );
  } catch (error) {
    useAlert(error?.message || t('KANBAN.SETTINGS.STAGES.REORDER_ERROR'));
  }
};

const openProducts = () => {
  productDrafts.value = products.value.map(product => ({ ...product }));
  productsDialogRef.value?.open();
};

const addProduct = () => {
  productDrafts.value.push({
    id: `${Date.now()}-${productDrafts.value.length}`,
    name: '',
    price: '',
  });
};

const removeProduct = productId => {
  productDrafts.value = productDrafts.value.filter(
    product => product.id !== productId
  );
};

const saveProducts = () => {
  products.value = productDrafts.value
    .filter(product => product.name.trim())
    .map(product => ({
      id: product.id,
      name: product.name.trim(),
      price: Number(product.price) || 0,
    }));
  productsDialogRef.value?.close();
};

const deleteBoard = async () => {
  if (!window.confirm(t('KANBAN.BOARD.DELETE_CONFIRM'))) return;

  try {
    await store.dispatch('kanban/deleteBoard', boardId.value);
    goBack();
    useAlert(t('KANBAN.BOARD.DELETE_SUCCESS'));
  } catch (error) {
    useAlert(error?.message || t('KANBAN.BOARD.DELETE_ERROR'));
  }
};

onMounted(async () => {
  await Promise.all([
    store.dispatch('kanban/getBoards'),
    store.dispatch('kanban/getColumns', boardId.value),
    store.dispatch('agents/get'),
    store.dispatch('inboxes/get'),
  ]);
  hydrateForm();
});
</script>

<template>
  <main
    class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-n-background"
  >
    <div
      v-if="isLoading"
      class="flex flex-1 items-center justify-center gap-3 text-n-slate-11"
    >
      <Spinner class="size-5" />
      <span>{{ $t('KANBAN.LOADING') }}</span>
    </div>

    <div v-else-if="board" class="flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
        <header class="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-3">
            <Button icon="i-lucide-arrow-left" slate ghost sm @click="goBack" />
            <h1 class="truncate text-xl font-semibold text-n-slate-12">
              {{ board.name }}
            </h1>
            <span
              class="grid size-6 place-items-center rounded-full bg-n-alpha-2 text-xs font-semibold text-n-slate-11"
            >
              {{ localColumns.length }}
            </span>
          </div>
          <div class="flex items-center gap-4">
            <button
              type="button"
              class="flex items-center gap-2 text-sm text-n-slate-11"
              @click="copyBoardId"
            >
              <span>{{ $t('KANBAN.SETTINGS.ID', { id: boardId }) }}</span>
              <span class="i-lucide-copy size-4" />
            </button>
            <Button
              :label="$t('KANBAN.SETTINGS.SAVE')"
              :is-loading="uiFlags.isUpdatingBoard"
              :disabled="!boardName.trim()"
              @click="saveBoard"
            />
          </div>
        </header>

        <div class="space-y-8">
          <section class="space-y-4">
            <h2 class="text-lg font-semibold text-n-slate-12">
              {{ $t('KANBAN.SETTINGS.BASIC.TITLE') }}
            </h2>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-n-slate-12">
                {{ $t('KANBAN.SETTINGS.BASIC.NAME') }}
              </span>
              <input
                v-model="boardName"
                type="text"
                class="h-10 w-full rounded-md border border-n-weak bg-n-alpha-1 px-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
              />
            </label>
            <Editor
              v-model="boardDescription"
              editor-key="kanban-board-description"
              :label="$t('KANBAN.SETTINGS.BASIC.DESCRIPTION')"
              :placeholder="$t('KANBAN.SETTINGS.BASIC.DESCRIPTION_PLACEHOLDER')"
              :max-length="2000"
              :enable-canned-responses="false"
            />
          </section>

          <section class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold text-n-slate-12">
                  {{ $t('KANBAN.SETTINGS.STAGES.TITLE') }}
                </h2>
                <span
                  class="grid size-6 place-items-center rounded-full bg-n-alpha-2 text-xs font-semibold text-n-slate-11"
                >
                  {{ localColumns.length }}
                </span>
              </div>
              <Button
                icon="i-lucide-plus"
                slate
                outline
                sm
                :label="$t('KANBAN.COLUMN.CREATE')"
                @click="openCreateColumn"
              />
            </div>

            <Draggable
              v-model="localColumns"
              item-key="id"
              handle=".stage-drag-handle"
              class="space-y-2"
              @end="reorderColumns"
            >
              <template #item="{ element }">
                <div
                  class="flex h-12 items-center gap-3 rounded-lg bg-n-solid-2 px-4 text-sm text-n-slate-12"
                >
                  <span
                    class="stage-drag-handle i-lucide-grip-vertical size-4 cursor-grab text-n-slate-10"
                  />
                  <span
                    class="size-3 rounded-full"
                    :class="colorClass(element.color)"
                  />
                  <span class="min-w-0 flex-1 truncate font-medium">{{
                    element.name
                  }}</span>
                  <span
                    class="grid h-6 min-w-6 place-items-center rounded-full bg-n-alpha-2 px-2 text-xs text-n-slate-11"
                  >
                    {{ element.cardsCount || 0 }}
                  </span>
                  <span
                    v-if="element.outcome === 'won'"
                    class="rounded-full bg-n-teal-3 px-2 py-1 text-xs font-medium text-n-teal-11"
                  >
                    {{ $t('KANBAN.SETTINGS.STAGES.WON') }}
                  </span>
                  <span
                    v-else-if="element.outcome === 'lost'"
                    class="rounded-full bg-n-ruby-3 px-2 py-1 text-xs font-medium text-n-ruby-11"
                  >
                    {{ $t('KANBAN.SETTINGS.STAGES.LOST') }}
                  </span>
                  <Button
                    icon="i-lucide-pencil"
                    slate
                    ghost
                    sm
                    @click="openEditColumn(element)"
                  />
                </div>
              </template>
            </Draggable>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-n-slate-12">
              {{ $t('KANBAN.SETTINGS.AGENTS') }}
            </h2>
            <div class="min-h-11 rounded-lg bg-n-solid-2 p-2">
              <MultiSelect
                v-model="selectedAgents"
                :options="agentOptions"
                :max-chips="20"
              />
            </div>
          </section>

          <section class="space-y-3">
            <h2 class="text-lg font-semibold text-n-slate-12">
              {{ $t('KANBAN.SETTINGS.INBOXES') }}
            </h2>
            <div class="min-h-11 rounded-lg bg-n-solid-2 p-2">
              <MultiSelect
                v-model="selectedInboxes"
                :options="inboxOptions"
                :max-chips="20"
              />
            </div>
          </section>

          <section class="space-y-4">
            <h2 class="text-lg font-semibold text-n-slate-12">
              {{ $t('KANBAN.SETTINGS.OPPORTUNITIES.TITLE') }}
            </h2>
            <div>
              <label class="mb-2 block text-sm font-medium text-n-slate-12">
                {{ $t('KANBAN.SETTINGS.OPPORTUNITIES.CURRENCY') }}
              </label>
              <Select v-model="currency" :options="currencyOptions" />
            </div>
            <div class="space-y-2">
              <h3 class="text-sm font-medium text-n-slate-12">
                {{ $t('KANBAN.SETTINGS.PRODUCTS.TITLE') }}
              </h3>
              <p class="text-sm text-n-slate-11">
                {{ $t('KANBAN.SETTINGS.PRODUCTS.DESCRIPTION') }}
              </p>
              <Button
                icon="i-lucide-package"
                outline
                sm
                :label="$t('KANBAN.SETTINGS.PRODUCTS.MANAGE')"
                @click="openProducts"
              />
            </div>
          </section>

          <section class="border-t border-n-weak pt-6">
            <h2 class="text-lg font-semibold text-n-ruby-11">
              {{ $t('KANBAN.SETTINGS.DELETE.TITLE') }}
            </h2>
            <p class="mt-2 text-sm text-n-slate-11">
              {{ $t('KANBAN.SETTINGS.DELETE.DESCRIPTION') }}
            </p>
            <Button
              class="mt-4"
              icon="i-lucide-trash-2"
              ruby
              outline
              :label="$t('KANBAN.SETTINGS.DELETE.BUTTON')"
              @click="deleteBoard"
            />
          </section>
        </div>
      </div>
    </div>

    <Dialog
      ref="columnDialogRef"
      :title="
        editingColumn ? $t('KANBAN.COLUMN.EDIT') : $t('KANBAN.COLUMN.CREATE')
      "
      :confirm-button-label="$t('KANBAN.SETTINGS.STAGES.SAVE')"
      :disable-confirm-button="!columnName.trim()"
      :is-loading="uiFlags.isCreatingColumn || uiFlags.isUpdatingColumn"
      width="lg"
      @confirm="saveColumn"
      @close="resetColumnForm"
    >
      <div class="grid gap-4">
        <label>
          <span class="mb-2 block text-sm font-medium text-n-slate-12">{{
            $t('KANBAN.COLUMN.NAME_LABEL')
          }}</span>
          <input
            v-model="columnName"
            type="text"
            class="h-10 w-full rounded-md border border-n-weak bg-n-alpha-1 px-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
          />
        </label>
        <label>
          <span class="mb-2 block text-sm font-medium text-n-slate-12">{{
            $t('KANBAN.COLUMN.DESCRIPTION_LABEL')
          }}</span>
          <textarea
            v-model="columnDescription"
            :maxlength="120"
            class="h-24 w-full resize-none rounded-md border border-n-weak bg-n-alpha-1 p-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
          />
        </label>
        <div>
          <span class="mb-2 block text-sm font-medium text-n-slate-12">{{
            $t('KANBAN.COLUMN.COLOR_LABEL')
          }}</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in KANBAN_COLUMN_COLORS"
              :key="color.value"
              type="button"
              class="grid size-9 place-items-center rounded-md border border-n-weak"
              :class="
                columnColor === color.value
                  ? color.selectedClass
                  : color.hoverClass
              "
              @click="columnColor = color.value"
            >
              <span class="size-5 rounded-full" :class="color.class" />
            </button>
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <label>
            <span class="mb-2 block text-sm font-medium text-n-slate-12">{{
              $t('KANBAN.COLUMN.WIN_PROBABILITY_LABEL')
            }}</span>
            <input
              v-model="columnProbability"
              type="number"
              min="0"
              max="100"
              class="h-10 w-full rounded-md border border-n-weak bg-n-alpha-1 px-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
            />
          </label>
          <label>
            <span class="mb-2 block text-sm font-medium text-n-slate-12">{{
              $t('KANBAN.SETTINGS.STAGES.OUTCOME')
            }}</span>
            <Select v-model="columnOutcome" :options="outcomeOptions" />
          </label>
        </div>
        <Button
          v-if="editingColumn"
          class="justify-self-start"
          icon="i-lucide-trash-2"
          ruby
          ghost
          :label="$t('KANBAN.COLUMN.DELETE')"
          @click="deleteColumn"
        />
      </div>
    </Dialog>

    <Dialog
      ref="productsDialogRef"
      :title="$t('KANBAN.SETTINGS.PRODUCTS.MODAL_TITLE')"
      :confirm-button-label="$t('KANBAN.SETTINGS.PRODUCTS.SAVE')"
      width="lg"
      @confirm="saveProducts"
    >
      <div class="space-y-3">
        <div
          v-for="product in productDrafts"
          :key="product.id"
          class="grid grid-cols-[1fr_10rem_auto] gap-2"
        >
          <input
            v-model="product.name"
            type="text"
            :placeholder="$t('KANBAN.SETTINGS.PRODUCTS.NAME')"
            class="h-10 rounded-md border border-n-weak bg-n-alpha-1 px-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
          />
          <input
            v-model="product.price"
            type="number"
            min="0"
            step="0.01"
            :placeholder="$t('KANBAN.SETTINGS.PRODUCTS.PRICE')"
            class="h-10 rounded-md border border-n-weak bg-n-alpha-1 px-3 text-sm text-n-slate-12 outline-none focus:border-n-brand"
          />
          <Button
            icon="i-lucide-trash-2"
            ruby
            ghost
            @click="removeProduct(product.id)"
          />
        </div>
        <Button
          icon="i-lucide-plus"
          slate
          outline
          sm
          :label="$t('KANBAN.SETTINGS.PRODUCTS.ADD')"
          @click="addProduct"
        />
      </div>
    </Dialog>
  </main>
</template>
