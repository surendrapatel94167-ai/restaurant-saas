import { NavLink, useLocation } from 'react-router-dom';
import { Flame, UtensilsCrossed, Receipt, Clock, UserCog } from 'lucide-react';

const NAV_BY_ROLE = {
  chef: [
    { to: '/kds', label: 'Kitchen', icon: Flame, end: true },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/my-profile', label: 'Profile', icon: UserCog },
  ],
  waiter: [
    { to: '/kds', label: 'Orders', icon: Flame, end: true },
    { to: '/pending-payments', label: 'Payments', icon: Receipt },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/my-profile', label: 'Profile', icon: UserCog },
  ],
  cashier: [
    { to: '/kds', label: 'Orders', icon: Flame, end: true },
    { to: '/pending-payments', label: 'Payments', icon: Receipt },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/attendance', label: 'Attendance', icon: Clock },
    { to: '/my-profile', label: 'Profile', icon: UserCog },
  ],
};

export default function StaffBottomNav({ role }) {
  const location = useLocation();
  const items = NAV_BY_ROLE[role];
  if (!items) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      {items.map((item) => {
        const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 ${active ? 'text-brand-600' : 'text-gray-500'}`}
          >
            <item.icon size={20} className="flex-shrink-0" />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
