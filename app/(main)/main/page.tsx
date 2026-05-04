'use client';

import { useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from './page.module.css';
import { GroupNavigationStack, scrollBroadcaster } from '@/lib/NavigationStack';
import NavigationBar from '@/lib/NavigationBar';
import SideBar from '@/lib/SideBar';
import DashboardStack from './dashboard-stack/dashboard-stack';
import { HealthStack } from './health-stack/health-stack';
import { ManagementStack } from './management-stack/management-stack';
import NotificationsStack from './notifications-stack/notifications-stack';
import ProfileStack from './profile-stack/profile-stack';

export default function Main() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [active, setActive] = useState('dashboard-stack');

  const [profile] = useDemandState<any>(null, {
    key: 'profile',
    persist: true,
    scope: 'global',
  });

  const userRole = profile?.role;

  const navStackMap = useMemo(() => new Map<string, React.ReactElement>([
    ['dashboard-stack', <DashboardStack key="dashboard-stack" />],
    ...(userRole !== 'distributor' && userRole !== 'logger' ? [['health-stack', <HealthStack key="health-stack" />] as [string, React.ReactElement]] : []),
    ['management-stack', <ManagementStack key="management-stack" />],
    ['notifications-stack', <NotificationsStack key="notifications-stack" />],
    ['profile-stack', <ProfileStack key="profile-stack" />],
  ]), [userRole]);

  const allNavigationItems = [
      {
        id: 'dashboard-stack',
        text: t('dashboard') || 'Dashboard',
        svg: (
          <svg fill="none" height="1.30em" viewBox="0 0 24 24" width="1.30em" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor" />
          </svg>
        ),
      },
      {
        id: 'health-stack',
        text: t('health') || 'Health',
        svg: (
          <svg fill="none" height="1.30em" viewBox="0 0 24 24" width="1.30em" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" fill="currentColor" />
          </svg>
        ),
      },
      {
        id: 'management-stack',
        text: t('management') || 'Management',
        svg: (
          <svg fill="none" height="1.30em" viewBox="0 0 24 24" width="1.30em" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z" fill="currentColor" />
          </svg>
        ),
      },
      {
        id: 'notifications-stack',
        text: t('notifications') || 'Notifications',
        svg: (
          <svg fill="none" height="1.30em" viewBox="0 0 24 24" width="1.30em" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor" />
          </svg>
        ),
      },
      {
        id: 'profile-stack',
        text: t('profile') || 'Profile',
        svg: (
          <svg fill="none" height="1.30em" viewBox="0 0 22 22" width="1.30em" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 0C8.79 0 7 1.79 7 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 12c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" fill="currentColor" />
          </svg>
        ),
      },
  ];

  const navigationItems = allNavigationItems.filter(item => 
    (userRole === 'distributor' || userRole === 'logger') ? item.id !== 'health-stack' : true
  );

  const backgroundColor = theme === 'light' ? "#ffffff" : "#1a1a1a";
  const borderColor = theme === 'light' ? "#e5e7eb" : "#404040";

  return (
    <div className={`${styles.mainContainer} ${styles[`mainContainer_${theme}`]}`}>
      <div className={styles.contentWrapper}>
        <div className={styles.sidebarContainer}>
          <SideBar
            navKeys={navigationItems}
            activeId={active}
            activeColor={theme === 'light' ? "#dc2626" : "#ffffff"}
            inactiveColor={theme === 'light' ? "#6b7280" : "#fca5a5"}
            hoverColor={theme === 'light' ? "#b91c1c" : "#fee2e2"}
            backgroundColor={backgroundColor}
            textSize="14px"
            fontWeight={600}
            iconSize="18px"
            widthExpanded="220px"
            widthCollapsed="60px"
            onChange={(id) => setActive(id)}
            className={styles.mainSide}
          />
        </div>

        <div className={styles.contentArea}>
          <GroupNavigationStack
            id="main-group"
            navStack={navStackMap}
            current={active}
            onCurrentChange={setActive}
            persist
          />
        </div>
      </div>

      <div className={styles.navigationContainer}>
        <NavigationBar
          navKeys={navigationItems}
          mode="autohide"
          activeId={active}
          activeColor={theme === 'light' ? "#dc2626" : "#ffffff"}
          inactiveColor={theme === 'light' ? "#6b7280" : "#fca5a5"}
          hoverColor={theme === 'light' ? "#b91c1c" : "#fee2e2"}
          backgroundColor={backgroundColor}
          normalHeight="70px"
          shrinkHeight="0px"
          iconSize="18px"
          textSize="12px"
          fontWeight={600}
          itemSpacing="8px"
          paddingY="0px"
          paddingX="0px"
          breakpointSpacing={{
            '800': '32px',
            '500': '24px',
            '0': '16px',
          }}
          onScroll={(callback) => scrollBroadcaster.subscribe(callback)}
          barBorderTop={`1.5px solid ${borderColor}`}
          barBorderRadius="16px 16px 0 0"
          barShadow={theme === 'light' ? "0 -4px 20px rgba(45,45,45,0.1)" : "0 -4px 20px rgba(0,0,0,0.3)"}
          floatingButton={
            <svg xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              height="1.5em"
              width="1.5em"
              fill="currentColor">
              <path d="M3 6h18M3 12h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round" />
            </svg>
          }
          floatingButtonPosition="left"
          floatingButtonBottom="16px"
          floatingButtonPadding="16px"
          floatingButtonColor={theme === 'light' ? "#dc2626" : "#dc2626"}
          floatingButtonTextColor="#fff"
          floatingButtonRadius="50%"
          floatingButtonShadow={theme === 'light' ? "0 6px 12px rgba(0,0,0,0.25)" : "0 6px 12px rgba(0,0,0,0.4)"}
          onChange={(id) => setActive(id)}
          className={styles.mainNavigation}
        />
      </div>
    </div>
  );
}
