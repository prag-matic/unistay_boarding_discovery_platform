import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { api, type ApiClientError, type Pagination, type User, type UserRole } from '../services/api';

const PAGE_SIZE = 20;

type StatusFilter = '' | 'active' | 'inactive';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    size: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState('');

  const fetchUsers = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.getUsers({
        page: nextPage,
        size: PAGE_SIZE,
        role: roleFilter || undefined,
        active: statusFilter === '' ? undefined : statusFilter === 'active',
        search: searchQuery.trim() || undefined,
      });
      setUsers(response.users);
      setPagination(response.pagination);
      setPage(response.pagination.page);
      if (selectedUser) {
        const nextSelected = response.users.find((user) => user.id === selectedUser.id) ?? null;
        setSelectedUser(nextSelected);
      }
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setError('');
    try {
      await api.activateUser(id);
      await fetchUsers(page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to activate user');
    }
  };

  const handleDeactivate = async (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setError('');
    try {
      await api.deactivateUser(id);
      await fetchUsers(page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to deactivate user');
    }
  };

  useEffect(() => {
    void fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetchUsers(1);
    }, 300);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const startEntry = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.size + 1;
  const endEntry = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.size + users.length;

  return (
    <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto thin-scrollbar relative">
      <section className="shrink-0 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="font-label text-xs uppercase tracking-[0.15em] text-primary mb-1">User Management</p>
            <div className="flex items-baseline gap-4">
              <h2 className="font-headline text-3xl font-extrabold text-on-surface">Platform Users</h2>
              <span className="text-sm font-medium bg-primary-container text-on-primary-container px-3 py-1 rounded-full">
                {pagination.total} total users
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-full text-sm focus:ring-1 focus:ring-primary w-full md:w-64 outline-none shadow-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter((event.target.value as UserRole | '') || '')}
              className="py-2 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/30 rounded-md text-sm focus:ring-1 focus:ring-primary outline-none shadow-sm"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
              <option value="STUDENT">Student</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter((event.target.value as StatusFilter) || '')}
              className="py-2 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/30 rounded-md text-sm focus:ring-1 focus:ring-primary outline-none shadow-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </section>

      <section className="bg-surface-container-lowest rounded-xl overflow-hidden flex-1 shadow-[0px_20px_40px_rgba(42,52,57,0.04)] flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container-low z-10">
              <tr className="border-b border-outline-variant/15 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                <th className="px-6 py-4 font-bold">User ID</th>
                <th className="px-6 py-4 font-bold">Full Name</th>
                <th className="px-6 py-4 font-bold">Contact</th>
                <th className="px-6 py-4 font-bold">Role</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Created At</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="hover:bg-surface-container-high transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-5 font-mono text-xs text-on-surface-variant">{user.id}</td>
                    <td className="px-6 py-5 font-bold text-sm text-on-surface">{user.firstName} {user.lastName}</td>
                    <td className="px-6 py-5">
                      <div className="text-sm">{user.email}</div>
                      <div className="text-xs text-on-surface-variant">{user.phone ?? '—'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="bg-surface-variant text-[10px] px-2 py-0.5 rounded-sm">{user.role}</span>
                    </td>
                    <td className="px-6 py-5">
                      {user.isActive ? (
                        <span className="bg-tertiary-container/20 text-on-tertiary-container text-[10px] font-bold px-2 py-1 rounded-sm">ACTIVE</span>
                      ) : (
                        <span className="bg-error-container/20 text-on-error-container text-[10px] font-bold px-2 py-1 rounded-sm">INACTIVE</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-xs text-on-surface-variant">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedUser(user);
                          }}
                          className="p-1.5 bg-surface-variant text-on-surface-variant rounded-md hover:scale-110 transition-transform"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        {user.isActive ? (
                          <button
                            onClick={(event) => void handleDeactivate(user.id, event)}
                            className="p-1.5 bg-error-container text-on-error-container rounded-md hover:scale-110 transition-transform"
                            title="Deactivate"
                          >
                            <span className="material-symbols-outlined text-sm">block</span>
                          </button>
                        ) : (
                          <button
                            onClick={(event) => void handleActivate(user.id, event)}
                            className="p-1.5 bg-tertiary-container text-on-tertiary-container rounded-md hover:scale-110 transition-transform"
                            title="Activate"
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto p-4 border-t border-outline-variant/15 flex items-center justify-between bg-surface-container-low/50 shrink-0">
          <p className="text-xs text-on-surface-variant">
            Showing {startEntry} to {endEntry} of {pagination.total} entries
          </p>
          <div className="flex gap-2 items-center">
            <button
              className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded text-xs font-medium hover:bg-surface-variant disabled:opacity-50"
              disabled={pagination.page <= 1 || loading}
              onClick={() => void fetchUsers(pagination.page - 1)}
            >
              Previous
            </button>
            <span className="px-3 py-1 bg-primary text-on-primary rounded text-xs font-medium">
              {pagination.page}
            </span>
            <button
              className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded text-xs font-medium hover:bg-surface-variant disabled:opacity-50"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => void fetchUsers(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-inverse-surface/20 backdrop-blur-[4px]"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative bg-surface-container-lowest rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.1)] w-full max-w-md overflow-hidden border border-outline-variant/10">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <div>
                <span className="font-label text-[10px] uppercase tracking-widest text-primary">User Detail</span>
                <h3 className="font-headline text-xl font-bold">{selectedUser.firstName} {selectedUser.lastName}</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">User ID</label>
                  <p className="text-sm font-mono mt-1">{selectedUser.id}</p>
                </div>
                <div>
                  <label className="font-label text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Role</label>
                  <p className="text-sm mt-1">{selectedUser.role}</p>
                </div>
                <div>
                  <label className="font-label text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Email</label>
                  <p className="text-sm mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="font-label text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Phone</label>
                  <p className="text-sm mt-1">{selectedUser.phone ?? '—'}</p>
                </div>
                <div>
                  <label className="font-label text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Status</label>
                  <div className="mt-1">
                    {selectedUser.isActive ? (
                      <span className="bg-tertiary-container/20 text-on-tertiary-container text-[10px] font-bold px-2 py-1 rounded-sm">ACTIVE</span>
                    ) : (
                      <span className="bg-error-container/20 text-on-error-container text-[10px] font-bold px-2 py-1 rounded-sm">INACTIVE</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="font-label text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Created At</label>
                  <p className="text-sm mt-1">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low/50 border-t border-outline-variant/10 flex justify-end gap-3">
              {selectedUser.isActive ? (
                <button
                  onClick={() => {
                    void handleDeactivate(selectedUser.id);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-error text-on-error rounded-md text-sm font-bold transition-all hover:brightness-110"
                >
                  Deactivate User
                </button>
              ) : (
                <button
                  onClick={() => {
                    void handleActivate(selectedUser.id);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-tertiary text-on-tertiary rounded-md text-sm font-bold transition-all hover:brightness-110"
                >
                  Activate User
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
