import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isDashboard = location.pathname === '/';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-surface font-body text-on-surface overflow-hidden">
      {/* SideNavBar Shell */}
      {!isDashboard && (
        <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 dark:bg-slate-950 flex flex-col border-r border-slate-200/50 dark:border-slate-800/50 font-headline text-sm tracking-tight z-50">
          <div className="p-6">
            <h1 className="text-xl font-bold tracking-tight text-primary">UniStay</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mt-1">Admin Panel</p>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <Link
              to="/"
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-colors rounded-lg",
                location.pathname === '/' 
                  ? "text-primary font-semibold border-r-2 border-primary bg-primary-container/40 rounded-r-none" 
                  : "text-on-surface-variant hover:text-primary hover:bg-primary-container/30"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>dashboard</span>
              <span>Dashboard</span>
            </Link>
            <Link
              to="/users"
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-colors rounded-lg",
                location.pathname === '/users' 
                  ? "text-primary font-semibold border-r-2 border-primary bg-primary-container/40 rounded-r-none" 
                  : "text-on-surface-variant hover:text-primary hover:bg-primary-container/30"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>group</span>
              <span>Users</span>
            </Link>
            <Link
              to="/moderation"
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-colors rounded-lg",
                location.pathname === '/moderation' 
                  ? "text-primary font-semibold border-r-2 border-primary bg-primary-container/40 rounded-r-none" 
                  : "text-on-surface-variant hover:text-primary hover:bg-primary-container/30"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>security</span>
              <span>Boarding Moderation</span>
            </Link>
            <Link
              to="/marketplace-moderation"
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-colors rounded-lg",
                location.pathname === '/marketplace-moderation'
                  ? "text-primary font-semibold border-r-2 border-primary bg-primary-container/40 rounded-r-none"
                  : "text-on-surface-variant hover:text-primary hover:bg-primary-container/30"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>storefront</span>
              <span>Marketplace Moderation</span>
            </Link>
          </nav>
          <div className="p-4 mt-auto space-y-1 border-t border-slate-200/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-on-surface-variant hover:text-primary hover:bg-primary-container/30 transition-colors rounded-lg"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
              <span>Logout</span>
            </button>
            <div className="flex items-center gap-3 p-3 mt-4 bg-surface-container rounded-xl">
              <img alt="Executive User Profile" className="w-8 h-8 rounded-full bg-slate-200" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgkMVah6VtiK3ZFmqyBdWD8qmpnHr44ZWVrE2majtcxFFV_GvXc3DiEOAQaT7bsmWa_iuEPTDeUz8a3ifSwxj_a_SvWji5rQwlS_XXFQr0VQKhUYDQfD4HXoZJx-f9EK17FpfaCNhWZW-apBADOlhZGnew8M8uDQw2EjveGbMGeXDL6i5AN2w0WYcNl97HBJADZIJLea36bUruCjJteklFsqX9ftGguoVUVGaM5fBSfNEuPrPogmXrIewstyiQj-xl1VwlxMShBrs"/>
              <div className="overflow-hidden">
                <p className="font-bold text-xs truncate">{user ? `${user.firstName} ${user.lastName}` : 'Admin User'}</p>
                <p className="text-[10px] text-on-surface-variant">{user?.role ?? 'ADMIN'}</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className={cn("flex-1 flex flex-col relative h-screen", !isDashboard ? "ml-64" : "")}>
        {/* Content Canvas */}
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
