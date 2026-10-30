'use client';

import NavigationStack from '@academix-admin/navigation-stack';
import DashboardPage from './dashboard-stack/dashboard-page/page';
import CyclePage from './health-stack/cycle-page/page';
import CycleFormPage from './health-stack/cycle-form-page/page';
import ManagementHome from './management-stack/management-home/page';
import DistributionPage from './management-stack/distribution-page/page';
import DistributionFormPage from './management-stack/distribution-form-page/page';
import ExpensesPage from './management-stack/expenses-page/page';
import ExpenseFormPage from './management-stack/expense-form-page/page';
import ReportsPage from './management-stack/reports-page/page';
import MessagingPage from './management-stack/messaging-page/page';
import ChatPage from './management-stack/chat-page/page';
import CreateGroupPage from './management-stack/create-group-page/page';
import GroupChatPage from './management-stack/group-chat-page/page';
import AdminPage from './management-stack/admin-page/page';
import UserPage from './management-stack/user-page/page';
import UserFormPage from './management-stack/user-form-page/page';
import LogCyclePage from './management-stack/log-cycle-page/page';
import TransactionsPage from './management-stack/transactions-page/page';
import LedgerPage from './management-stack/ledger-page/page';
import StoriesPage from './management-stack/stories-page/page';
import StoryFormPage from './management-stack/story-form-page/page';
import FounderFormPage from './management-stack/founder-form-page/page';
import StoriesViewPage from './management-stack/stories-view-page/page';
import StoryDetailPage from './management-stack/story-detail-page/page';
import ReachPage from './management-stack/reach-page/page';
import NotificationsPage from './notifications-stack/notifications-page/page';
import ProfilePage from './profile-stack/profile-page/page';
import ProfileFormPage from './profile-stack/profile-form-page/page';

/*
 * One navigation stack per tab. The URL names a route by its POSITION in the merged map, so only ever
 * append to these maps. Pushes carry an id and an intent, never a record: a page reads its record
 * from the owning hook, so it survives a reload.
 */
const STORY_PAGES = { stories_view_page: StoriesViewPage, story_detail_page: StoryDetailPage };

export const DashboardStack = () => (
  <NavigationStack id="dashboard-stack" navLink={{ dashboard_page: DashboardPage }} additionalNavLinks={[STORY_PAGES]} entry="dashboard_page" transition="slide" syncHistory persist />
);

export const HealthStack = () => (
  <NavigationStack id="health-stack" navLink={{ cycle_page: CyclePage, cycle_form_page: CycleFormPage }} entry="cycle_page" transition="slide" syncHistory persist />
);

export const ManagementStack = () => (
  <NavigationStack
    id="management-stack"
    navLink={{
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
      distribution_form_page: DistributionFormPage,
      expense_form_page: ExpenseFormPage,
      user_page: UserPage,
      user_form_page: UserFormPage,
      story_form_page: StoryFormPage,
      founder_form_page: FounderFormPage,
      reach_page: ReachPage,
    }}
    additionalNavLinks={[STORY_PAGES]}
    entry="management_home"
    transition="slide"
    syncHistory
    persist
  />
);

export const NotificationsStack = () => (
  <NavigationStack id="notifications-stack" navLink={{ notifications_page: NotificationsPage }} entry="notifications_page" transition="slide" syncHistory persist />
);

export const ProfileStack = () => (
  <NavigationStack id="profile-stack" navLink={{ profile_page: ProfilePage, profile_form_page: ProfileFormPage }} entry="profile_page" transition="slide" syncHistory persist />
);
