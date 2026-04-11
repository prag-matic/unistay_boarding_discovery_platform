import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, type AdminDashboardKpis, type ApiClientError } from '../services/api';
import { useAuth } from '../auth/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<AdminDashboardKpis | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getAdminDashboardKpis();
        setKpis(data);
      } catch (err) {
        const apiError = err as ApiClientError;
        setError(apiError.message || 'Failed to load dashboard KPIs');
      }
    };

    void load();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto mt-8">
      <h1 className="font-headline text-3xl font-extrabold text-on-surface mb-8">Executive Dashboard</h1>
      {error && <p className="text-sm text-error mb-4">{error}</p>}
      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link to="/admin-profile" aria-label="Go to My Account" className="focus-ring-control rounded-full">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Admin profile"
                  className="w-16 h-16 rounded-full object-cover border border-outline-variant/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant">person</span>
                </div>
              )}
            </Link>

            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-[0.1em]">Welcome back</p>
              <h2 className="font-headline text-2xl font-bold text-on-surface mt-1">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Admin'}</h2>
              <p className="text-sm text-on-surface-variant mt-1 break-all">{user?.email ?? '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-[0.1em]">Role</p>
              <p className="text-sm font-semibold text-on-surface mt-1">{user?.role ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-[0.1em]">Status</p>
              <p className="text-sm font-semibold text-on-surface mt-1">{user?.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="text-xs text-on-surface-variant">Users</p>
          <p className="text-2xl font-bold">{kpis?.users.total ?? '—'}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="text-xs text-on-surface-variant">Pending Boardings</p>
          <p className="text-2xl font-bold">{kpis?.moderation.pendingBoardings ?? '—'}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="text-xs text-on-surface-variant">Pending Reservations</p>
          <p className="text-2xl font-bold">{kpis?.moderation.pendingReservations ?? '—'}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="text-xs text-on-surface-variant">Pending Visit Requests</p>
          <p className="text-2xl font-bold">{kpis?.moderation.pendingVisitRequests ?? '—'}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="text-xs text-on-surface-variant">Pending Payments</p>
          <p className="text-2xl font-bold">{kpis?.moderation.pendingPayments ?? '—'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link 
          to="/users" 
          className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.04)] hover:shadow-[0px_20px_40px_rgba(42,52,57,0.08)] transition-all flex items-center gap-6 group border border-outline-variant/20"
        >
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">group</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Users</h2>
            <p className="text-sm text-on-surface-variant mt-1">Manage platform users, roles, and access.</p>
          </div>
        </Link>
        
        <Link 
          to="/moderation" 
          className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.04)] hover:shadow-[0px_20px_40px_rgba(42,52,57,0.08)] transition-all flex items-center gap-6 group border border-outline-variant/20"
        >
          <div className="w-16 h-16 rounded-full bg-tertiary-container text-on-tertiary-fixed flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">security</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Moderation</h2>
            <p className="text-sm text-on-surface-variant mt-1">Review and approve boarding listings.</p>
          </div>
        </Link>

        <Link
          to="/reservations"
          className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.04)] hover:shadow-[0px_20px_40px_rgba(42,52,57,0.08)] transition-all flex items-center gap-6 group border border-outline-variant/20"
        >
          <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">calendar_month</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Reservations</h2>
            <p className="text-sm text-on-surface-variant mt-1">Track reservation requests and statuses.</p>
          </div>
        </Link>

        <Link
          to="/visit-requests"
          className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.04)] hover:shadow-[0px_20px_40px_rgba(42,52,57,0.08)] transition-all flex items-center gap-6 group border border-outline-variant/20"
        >
          <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">event_upcoming</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Visit Requests</h2>
            <p className="text-sm text-on-surface-variant mt-1">Monitor and review visit request activity.</p>
          </div>
        </Link>

        <Link
          to="/payments"
          className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.04)] hover:shadow-[0px_20px_40px_rgba(42,52,57,0.08)] transition-all flex items-center gap-6 group border border-outline-variant/20"
        >
          <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">payments</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Payments</h2>
            <p className="text-sm text-on-surface-variant mt-1">Review and moderate payment submissions.</p>
          </div>
        </Link>

        <Link
          to="/reviews"
          className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.04)] hover:shadow-[0px_20px_40px_rgba(42,52,57,0.08)] transition-all flex items-center gap-6 group border border-outline-variant/20"
        >
          <div className="w-16 h-16 rounded-full bg-tertiary-container text-on-tertiary-fixed flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">reviews</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Reviews</h2>
            <p className="text-sm text-on-surface-variant mt-1">Moderate user-generated reviews.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
