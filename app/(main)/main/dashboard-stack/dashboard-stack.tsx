'use client';

import NavigationStack from '@/lib/NavigationStack';
import DashboardPage from './dashboard-page/page';
import StoriesViewPage from '../management-stack/stories-view-page/page';

const dashboardStackNavLink = {
  dashboard_page: DashboardPage,
  stories_view_page: StoriesViewPage,
};

export default function DashboardStack() {
  return (
    <NavigationStack
      id="dashboard-stack"
      navLink={dashboardStackNavLink}
      entry="dashboard_page"
      syncHistory
      transition="slide"
      persist
    />
  );
}
