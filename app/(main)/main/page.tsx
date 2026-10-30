'use client';

import { useMemo, useState } from 'react';
import { GroupNavigationStack, ViewportInsetsProvider, popStackToRoot, scrollBroadcaster, useResizeToAvoidKeyboard, useRevealTappedInRows } from '@academix-admin/navigation-stack';
import NavigationBar from '@academix-admin/navigation-bar';
import SideBar from '@academix-admin/sidebar';
import { useLanguage } from '@/context/LanguageContext';
import { useRole } from '@/lib/stacks/data';
import { BellIcon, CalendarIcon, GridIcon, HomeIcon, MenuIcon, PersonIcon } from '@/components/ui/icons';
import { useTabBarHidden } from '@/components/ui/page';
import { Wordmark } from '@/components/ui/logo';
import { DashboardStack, HealthStack, ManagementStack, NotificationsStack, ProfileStack } from './stacks';
import styles from './shell.module.css';

/**
 * The app shell, wired as academix-web and JIMSteps wire it: one navigation stack per tab in a
 * GroupNavigationStack, and two navigators fed the same tabs, with CSS picking one. A SideBar from
 * 801px up, and below that a NavigationBar that slides away on scroll and comes back on the way up.
 */
function Shell() {
  useRevealTappedInRows();
  useResizeToAvoidKeyboard({ enabled: true });
  const { t } = useLanguage();
  const role = useRole();
  const tabBarHidden = useTabBarHidden();
  const [active, setActive] = useState('dashboard-stack');

  const navStack = useMemo(
    () =>
      new Map([
        ['dashboard-stack', <DashboardStack key="dashboard" />],
        ['health-stack', <HealthStack key="health" />],
        ['management-stack', <ManagementStack key="management" />],
        ['notifications-stack', <NotificationsStack key="notifications" />],
        ['profile-stack', <ProfileStack key="profile" />],
      ]),
    [],
  );

  const tabs = useMemo(() => {
    const all = [
      { id: 'dashboard-stack', text: t('dashboard') || 'Dashboard', svg: <HomeIcon /> },
      { id: 'health-stack', text: t('health') || 'Health', svg: <CalendarIcon /> },
      { id: 'management-stack', text: 'Manage', svg: <GridIcon /> },
      { id: 'notifications-stack', text: 'Alerts', svg: <BellIcon /> },
      { id: 'profile-stack', text: t('profile') || 'Profile', svg: <PersonIcon /> },
    ];
    return role === 'distributor' || role === 'logger' ? all.filter((tab) => tab.id !== 'health-stack') : all;
  }, [t, role]);

  return (
    <div className={styles.shell} data-tabs-hidden={tabBarHidden || undefined}>
      <div className={styles.row}>
        <div className={styles.side}>
          <SideBar
            navKeys={tabs}
            activeId={active}
            onChange={(id) => setActive(id)}
            logo={<Wordmark />}
            backgroundColor="var(--color-surface)"
            activeColor="var(--color-accent-ink)"
            inactiveColor="var(--color-text-muted)"
            hoverColor="var(--color-text)"
            borderRight="1px solid var(--color-border)"
            shadow="none"
            widthExpanded="232px"
            widthCollapsed="64px"
            textSize="15px"
            iconSize="20px"
            fontWeight={600}
          />
        </div>
        <div className={styles.stacks}>
          <GroupNavigationStack id="main-group" navStack={navStack} current={active} onCurrentChange={setActive} persist backStaysInTab />
        </div>
      </div>
      {!tabBarHidden && (
        <div className={styles.navWrap}>
          <NavigationBar
            navKeys={tabs}
            activeId={active}
            onChange={(id) => setActive(id)}
            onReselect={(id) => popStackToRoot(id)}
            onScroll={(callback) => scrollBroadcaster.subscribe(callback)}
            mode="autohide"
            normalHeight="68px"
            shrinkHeight="0px"
            barBorderTop="1px solid var(--color-border)"
            barBorderRadius="0"
            barShadow="none"
            backgroundColor="var(--color-surface)"
            activeColor="var(--color-accent-ink)"
            inactiveColor="var(--color-text-muted)"
            hoverColor="var(--color-text)"
            iconSize="22px"
            textSize="12px"
            fontWeight={600}
            itemSpacing="4px"
            paddingX="0px"
            paddingY="0px"
            breakpointSpacing={{ '800': '32px', '500': '24px', '0': '8px' }}
            floatingButton={<MenuIcon size="1.4em" />}
            floatingButtonPosition="left"
            floatingButtonBottom="16px"
            floatingButtonPadding="14px"
            floatingButtonColor="var(--color-surface)"
            floatingButtonTextColor="var(--color-text)"
            floatingButtonRadius="50%"
            floatingButtonShadow="var(--shadow-float)"
          />
        </div>
      )}
    </div>
  );
}

export default function Main() {
  return (
    <ViewportInsetsProvider>
      <Shell />
    </ViewportInsetsProvider>
  );
}
