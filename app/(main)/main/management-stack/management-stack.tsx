'use client';

import NavigationStack from '@/lib/NavigationStack';
import ManagementHome from './management-home/page';
import DistributionPage from './distribution-page/page';
import ExpensesPage from './expenses-page/page';
import ReportsPage from './reports-page/page';
import MessagingPage from './messaging-page/page';
import AdminPage from './admin-page/page';
import ChatPage from './chat-page/page';
import CreateGroupPage from './create-group-page/page';
import GroupChatPage from './group-chat-page/page';
import LogCyclePage from './log-cycle-page/page';
import TransactionsPage from './transactions-page/page';
import LedgerPage from './ledger-page/page';
import StoriesPage from './stories-page/page';
import StoriesViewPage from './stories-view-page/page';

const managementStackNavLink = {
  management_home: ManagementHome,
  distribution_page: DistributionPage,
  expenses_page: ExpensesPage,
  reports_page: ReportsPage,
  messaging_page: MessagingPage,
  admin_page: AdminPage,
  chat_page: ChatPage,
  create_group_page: CreateGroupPage,
  group_chat_page: GroupChatPage,
  log_cycle_page: LogCyclePage,
  transactions_page: TransactionsPage,
  ledger_page: LedgerPage,
  stories_page: StoriesPage,
  stories_view_page: StoriesViewPage,
};

export const ManagementStack = () => (
  <NavigationStack
    id="management-stack"
    navLink={managementStackNavLink}
    entry="management_home"
    syncHistory
    transition="slide"
    persist
  />
);
