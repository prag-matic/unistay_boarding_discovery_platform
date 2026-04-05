import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto mt-8">
      <h1 className="font-headline text-3xl font-extrabold text-on-surface mb-8">Executive Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link 
          to="/users" 
          className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.04)] hover:shadow-[0px_20px_40px_rgba(42,52,57,0.08)] transition-all flex items-center gap-6 group border border-outline-variant/10"
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
          className="bg-surface-container-lowest p-6 rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.04)] hover:shadow-[0px_20px_40px_rgba(42,52,57,0.08)] transition-all flex items-center gap-6 group border border-outline-variant/10"
        >
          <div className="w-16 h-16 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">security</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Moderation</h2>
            <p className="text-sm text-on-surface-variant mt-1">Review and approve boarding listings.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
