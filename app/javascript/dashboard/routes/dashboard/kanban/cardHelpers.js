import { extractTextFromMarkdown } from 'dashboard/helper/editorHelper';
import { KANBAN_COLUMN_COLORS } from './columnColors';

export const CARD_PRIORITIES = [
  { value: 'urgent', icon: 'i-lucide-chevrons-up', colorClass: 'text-n-ruby-11' },
  { value: 'high', icon: 'i-lucide-chevron-up', colorClass: 'text-n-amber-11' },
  { value: 'medium', icon: 'i-lucide-equal', colorClass: 'text-n-blue-11' },
  { value: 'low', icon: 'i-lucide-chevron-down', colorClass: 'text-n-teal-11' },
  { value: 'none', icon: 'i-lucide-minus', colorClass: 'text-n-slate-10' },
];

export const DEFAULT_CARD_METADATA = {
  title: '',
  description: '',
  priority: 'none',
  completed: false,
  amount: 0,
  products: [],
  startsAt: null,
  dueAt: null,
  agentIds: [],
};

const COLUMN_COLOR_DOTS = {
  blue: 'bg-n-blue-9',
  amber: 'bg-n-amber-9',
  violet: 'bg-n-violet-9',
  iris: 'bg-n-iris-9',
  teal: 'bg-n-teal-9',
  green: 'bg-green-500',
  ruby: 'bg-n-ruby-9',
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  slate: 'bg-n-slate-9',
};

const CURRENCY_LOCALES = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
};

export const normalizeColumnColor = ({ color, name } = {}) => {
  const normalizedColor = String(color || '').toLowerCase();
  if (!normalizedColor) {
    const normalizedName = String(name || '').toLowerCase();
    if (normalizedName.includes('aguardando')) return 'amber';
    if (normalizedName.includes('progress')) return 'violet';
    if (normalizedName.includes('progresso')) return 'violet';
    if (normalizedName.includes('done') || normalizedName.includes('resolvido')) {
      return 'teal';
    }
    if (normalizedName.includes('análise') || normalizedName.includes('analise')) {
      return 'blue';
    }
    return 'slate';
  }

  const aliases = {
    '#3b82f6': 'blue',
    '#60a5fa': 'blue',
    '#f59e0b': 'amber',
    '#fbbf24': 'amber',
    '#a78bfa': 'violet',
    '#8b5cf6': 'violet',
    purple: 'violet',
    '#10b981': 'teal',
    '#34d399': 'teal',
    '#30a46c': 'green',
    '#f87171': 'ruby',
    '#e5484d': 'red',
    '#f5d90a': 'yellow',
    '#5b5bd6': 'iris',
    gray: 'slate',
    grey: 'slate',
  };

  return aliases[normalizedColor] || normalizedColor;
};

export const columnDotClass = column => {
  const color = normalizeColumnColor(column);
  return COLUMN_COLOR_DOTS[color] || COLUMN_COLOR_DOTS.slate;
};

export const columnColorOption = column => {
  const color = normalizeColumnColor(column);
  return (
    KANBAN_COLUMN_COLORS.find(option => option.value === color) ||
    KANBAN_COLUMN_COLORS.find(option => option.value === 'slate')
  );
};

export const cardMetadata = card => {
  const metadata = card?.metadata;
  return {
    ...DEFAULT_CARD_METADATA,
    ...metadata,
    products: Array.isArray(metadata?.products) ? metadata.products : [],
    agentIds: Array.isArray(metadata?.agentIds) ? metadata.agentIds : [],
  };
};

export const cardConversationLabels = card =>
  Array.isArray(card?.conversationLabels) ? card.conversationLabels : [];

export const defaultCardTitle = ({ conversationDisplayId, contactName }) => {
  const contact = contactName || '';
  if (contact) return `Conversa #${conversationDisplayId} - ${contact}`;
  return `Conversa #${conversationDisplayId}`;
};

export const cardTitle = card => {
  const metadata = cardMetadata(card);
  if (metadata.title?.trim()) return metadata.title.trim();

  return defaultCardTitle({
    conversationDisplayId: card.conversationDisplayId,
    contactName: card.contact?.name,
  });
};

export const priorityOption = priority =>
  CARD_PRIORITIES.find(option => option.value === priority) ||
  CARD_PRIORITIES.find(option => option.value === 'none');

export const relativeAgeLabel = timestamp => {
  if (!timestamp) return '';

  const value = Number(timestamp) * (Number(timestamp) < 1e12 ? 1000 : 1);
  const diffMs = Math.max(Date.now() - value, 0);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export const cardDescriptionText = description =>
  extractTextFromMarkdown(description || '').trim();

export const cardDescriptionPreview = (description, maxLength = 120) => {
  const text = cardDescriptionText(description);
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

export const cardHasLongDescription = (description, maxLength = 120) =>
  cardDescriptionText(description).length > maxLength;

export const formatCurrency = (amount, currency = 'BRL') => {
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return '';

  return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || 'pt-BR', {
    style: 'currency',
    currency,
  }).format(parsedAmount);
};

export const formatDueDateLabel = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};

export const isDueDateOverdue = value => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
};

export const splitDatetimeValue = value => {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };

  const pad = number => String(number).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
};

export const combineDatetimeValue = (date, time = '00:00') => {
  if (!date) return null;
  const combined = new Date(`${date}T${time}`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined.toISOString();
};

export const toDatetimeLocalValue = value => {
  const { date, time } = splitDatetimeValue(value);
  if (!date) return '';
  return `${date}T${time}`;
};

export const fromDatetimeLocalValue = value => combineDatetimeValue(value);

export const getNextColumn = (columns, currentColumnId) => {
  const orderedColumns = [...columns].sort(
    (first, second) => first.position - second.position || first.id - second.id
  );
  const currentIndex = orderedColumns.findIndex(
    column => Number(column.id) === Number(currentColumnId)
  );
  if (currentIndex < 0 || currentIndex >= orderedColumns.length - 1) return null;
  return orderedColumns[currentIndex + 1];
};

export const resolveCardLabels = (labelTitles, accountLabels = []) =>
  labelTitles
    .map(title =>
      accountLabels.find(
        label => label.title.toLowerCase() === String(title).toLowerCase()
      ) || { title, color: '#94a3b8' }
    )
    .filter(Boolean);
