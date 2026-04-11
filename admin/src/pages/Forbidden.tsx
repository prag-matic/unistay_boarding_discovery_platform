import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Forbidden() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/20 shadow-[0px_20px_40px_rgba(42,52,57,0.06)] text-center">
        <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-2">Forbidden</p>
        <h1 className="font-headline text-3xl font-extrabold text-on-surface mb-3">Access denied</h1>
        <p className="text-sm text-on-surface-variant mb-6">
          Your account is authenticated but does not have ADMIN permission for this app.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-md bg-error text-on-error text-sm font-bold"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
