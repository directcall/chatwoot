import { frontendURL } from '../../../helper/URLHelper';
import KanbanView from './KanbanView.vue';
import KanbanSettings from './KanbanSettings.vue';

const commonMeta = {
  permissions: ['administrator', 'agent', 'conversation_manage'],
};

export const routes = [
  {
    path: frontendURL('accounts/:accountId/kanban'),
    name: 'kanban_dashboard_index',
    component: KanbanView,
    meta: commonMeta,
  },
  {
    path: frontendURL('accounts/:accountId/kanban/:boardId/settings'),
    name: 'kanban_board_settings',
    component: KanbanSettings,
    meta: commonMeta,
  },
  {
    path: frontendURL('accounts/:accountId/kanban/:boardId'),
    name: 'kanban_board_show',
    component: KanbanView,
    meta: commonMeta,
  },
];
