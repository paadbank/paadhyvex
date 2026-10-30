import type { ReactNode } from 'react';

/** The app's icons, in one place, so a glyph looks the same everywhere. Line icons on a 24 grid. */
type IconProps = { size?: string };

const svg = (size: string, children: ReactNode) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const icon = (children: ReactNode) => {
  const Icon = ({ size = '1.35em' }: IconProps) => svg(size, children);
  return Icon;
};

export const HomeIcon = icon(<><path d="m3 11 9-8 9 8" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>);
export const CalendarIcon = icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>);
export const GridIcon = icon(<><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></>);
export const BellIcon = icon(<><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>);
export const PersonIcon = icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>);
export const PeopleIcon = icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 15.5c1.7.7 2.9 2.2 3.5 4.5" /></>);
export const PackageIcon = icon(<><path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9Z" /><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9" /></>);
export const CameraIcon = icon(<><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" /></>);
export const WalletIcon = icon(<><path d="M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3" /><path d="M20 12h-4a1.5 1.5 0 0 0 0 3h4" /></>);
export const ChartIcon = icon(<><path d="M4 20V10M10 20V4M16 20v-8M21 20H3" /></>);
export const ShieldIcon = icon(<path d="M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6Z" />);
export const ChatIcon = icon(<path d="M4 5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 3.5V18a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />);
export const PenIcon = icon(<><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" /><path d="m14 8 3 3" /></>);
export const ReceiptIcon = icon(<><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z" /><path d="M9 8h6M9 12h6" /></>);
export const BookIcon = icon(<><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2Z" /><path d="M5 18a2 2 0 0 1 2-2h12" /></>);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const TrashIcon = icon(<><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></>);
export const DownloadIcon = icon(<><path d="M12 4v11M7 11l5 5 5-5" /><path d="M4 20h16" /></>);
export const ChevronIcon = icon(<path d="m9 6 6 6-6 6" />);
export const BackChevronIcon = icon(<path d="m15 6-6 6 6 6" />);
export const CloseIcon = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const MenuIcon = icon(<path d="M4 7h16M4 12h16M4 17h16" />);
export const SendIcon = icon(<path d="m4 12 16-8-5 16-3-7Z" />);
export const SunIcon = icon(<><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>);
export const MoonIcon = icon(<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z" />);
export const GlobeIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3.5 15 0 18M12 3c-3 3-3.5 15 0 18" /></>);
export const LogoutIcon = icon(<><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" /><path d="M15 8l4 4-4 4M19 12H9" /></>);
export const PinIcon = icon(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>);
export const PlayIcon = ({ size = '1.35em' }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
  </svg>
);
export const AlertIcon = icon(<><path d="M12 3 2.5 20h19Z" /><path d="M12 10v4M12 17h.01" /></>);
export const ImageIcon = icon(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.75" /><path d="m3.5 18 5.5-5 4 3.5 3-2.5 4.5 4" /></>);
