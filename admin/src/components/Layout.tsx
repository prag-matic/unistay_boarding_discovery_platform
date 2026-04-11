import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../auth/AuthContext';

type NavItem = {
  to: string;
  icon: string;
  label: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { to: '/', icon: 'dashboard', label: 'Dashboard' },
      ],
    },
    {
      title: 'Management',
      items: [
        { to: '/users', icon: 'group', label: 'User Management' },
        { to: '/reservations', icon: 'calendar_month', label: 'Reservations' },
        { to: '/visit-requests', icon: 'event_upcoming', label: 'Visit Requests' },
        { to: '/payments', icon: 'payments', label: 'Payments' },
        { to: '/reviews', icon: 'reviews', label: 'Reviews' },
      ],
    },
    {
      title: 'Boardings',
      items: [
        { to: '/moderation', icon: 'security', label: 'Approval Queue' },
        { to: '/manage-boardings', icon: 'apartment', label: 'All Boardings' },
      ],
    },
    {
      title: 'Marketplace',
      items: [
        { to: '/marketplace-moderation', icon: 'storefront', label: 'Moderation Queue' },
        { to: '/manage-marketplace', icon: 'inventory_2', label: 'All Listings' },
      ],
    },
    {
      title: 'System',
      items: [
        { to: '/audit-logs', icon: 'history', label: 'Activity Logs' },
        { to: '/admin-profile', icon: 'manage_accounts', label: 'My Account' },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-surface font-body text-on-surface overflow-hidden">
        <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest flex flex-col border-r border-outline-variant/40 font-headline text-sm tracking-tight z-50">
          <div className="p-6">
            <h1 className="text-xl font-bold tracking-tight text-primary">UniStay</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mt-1">Admin Panel</p>
          </div>
          <nav className="flex-1 px-4 pb-3 overflow-y-auto thin-scrollbar">
            {navSections.map((section) => (
              <div key={section.title} className="mb-4 last:mb-0">
                <p className="px-3 mb-1 text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/80">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 transition-colors rounded-lg",
                        isActive(item.to)
                          ? "text-primary font-semibold border-r-2 border-primary bg-primary-container/40 rounded-r-none"
                          : "text-on-surface-variant hover:text-primary hover:bg-primary-container/30"
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="p-4 mt-auto space-y-1 border-t border-outline-variant/40">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-on-surface-variant hover:text-primary hover:bg-primary-container/30 transition-colors rounded-lg"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
              <span>Logout</span>
            </button>
            <div className="flex items-center gap-3 p-3 mt-4 bg-surface-container rounded-xl">
              {user?.profileImageUrl ? (
                <img alt="Executive User Profile" className="w-8 h-8 rounded-full bg-surface-variant object-cover" src={user.profileImageUrl} />
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-base text-on-surface-variant">person</span>
                </div>
              )}
              <div className="overflow-hidden">
                <p className="font-bold text-xs truncate">{user ? `${user.firstName} ${user.lastName}` : 'Admin User'}</p>
                <p className="text-[10px] text-on-surface-variant">{user?.role ?? 'ADMIN'}</p>
              </div>
            </div>
          </div>
        </aside>

      <main className={cn("flex-1 flex flex-col relative h-screen", "ml-64")}>
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
