import type { MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import BulkActionBar from '../components/admin/BulkActionBar';
import DataTable from '../components/admin/DataTable';
import PaginationControls from '../components/admin/PaginationControls';
import StatusChip from '../components/admin/StatusChip';
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
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    roleFilter !== '' ||
    statusFilter !== '';

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setStatusFilter('');
  };

  const hasRows = users.length > 0;

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
      setSelectedUserIds([]);
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

  const toggleSelect = (id: string) => {
    setSelectedUserIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
      return;
    }
    setSelectedUserIds(users.map((user) => user.id));
  };

  const bulkSetActive = async (isActive: boolean) => {
    if (selectedUserIds.length === 0) return;
    setBulkLoading(true);
    setError('');
    try {
      await api.setUsersStatusBulk(selectedUserIds, isActive);
      await fetchUsers(page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to update selected users');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleActivate = async (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setActionLoadingId(id);
    setError('');
    try {
      await api.activateUser(id);
      await fetchUsers(page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to activate user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeactivate = async (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    setActionLoadingId(id);
    setError('');
    try {
      await api.deactivateUser(id);
      await fetchUsers(page);
    } catch (err) {
      const apiError = err as ApiClientError;
      setError(apiError.message || 'Failed to deactivate user');
    } finally {
      setActionLoadingId(null);
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

  return (
    <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto thin-scrollbar relative">
      <section className="shrink-0 flex flex-col gap-4">
        <div>
          <p className="font-label text-xs uppercase tracking-[0.15em] text-on-surface-variant mb-1">User Management</p>
          <div className="flex items-baseline gap-4">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">Platform Users</h2>
            <span className="text-sm font-medium bg-primary-container text-on-primary-container px-3 py-1 rounded-full">
              {pagination.total} total users
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low p-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Search</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
                <input
                  type="text"
                  placeholder="Name, email, phone"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="focus-ring-control pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface placeholder:text-on-surface-variant/80 w-full md:w-72"
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Role</p>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter((event.target.value as UserRole | '') || '')}
                className="focus-ring-control py-2.5 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-44"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-on-surface-variant mb-1">Status</p>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter((event.target.value as StatusFilter) || '')}
                className="focus-ring-control py-2.5 pl-3 pr-8 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-sm text-on-surface w-44"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2.5 text-xs font-medium border border-outline-variant/40 text-on-surface rounded-md hover:bg-surface-container-high transition-colors"
              >
                Clear filters
              </button>
            )}
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <BulkActionBar count={selectedUserIds.length} onClear={() => setSelectedUserIds([])}>
          <button
            className="px-3.5 py-2 rounded-md text-xs font-semibold bg-tertiary text-on-tertiary border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
            onClick={() => void bulkSetActive(true)}
            disabled={bulkLoading || loading || selectedUserIds.length === 0}
          >
            {bulkLoading ? 'Processing...' : 'Activate Selected'}
          </button>
          <button
            className="px-3.5 py-2 rounded-md text-xs font-semibold bg-error text-on-error border border-transparent hover:brightness-110 transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:border-outline-variant/30 disabled:cursor-not-allowed"
            onClick={() => void bulkSetActive(false)}
            disabled={bulkLoading || loading || selectedUserIds.length === 0}
          >
            {bulkLoading ? 'Processing...' : 'Deactivate Selected'}
          </button>
        </BulkActionBar>
      </section>

      <DataTable
        columns={[
          <input
            type="checkbox"
            checked={users.length > 0 && selectedUserIds.length === users.length}
            onChange={toggleSelectAll}
          />,
          'User ID',
          'Full Name',
          'Contact',
          'Role',
          'Status',
          'Created At',
          'Actions',
        ]}
        loading={loading}
        emptyText="No users found."
        colSpan={8}
      >
        {users.map((user) => (
          <tr
            key={user.id}
            onClick={() => setSelectedUser(user)}
            className="hover:bg-surface-container-high transition-colors cursor-pointer group"
          >
            <td className="px-6 py-5" onClick={(event) => event.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                onChange={() => toggleSelect(user.id)}
                disabled={bulkLoading || actionLoadingId === user.id}
              />
            </td>
            <td className="px-6 py-5 font-mono text-sm text-on-surface-variant">{user.id}</td>
            <td className="px-6 py-5 font-bold text-sm text-on-surface">{user.firstName} {user.lastName}</td>
            <td className="px-6 py-5">
              <div className="text-sm">{user.email}</div>
              <div className="text-xs text-on-surface-variant">{user.phone ?? '—'}</div>
            </td>
            <td className="px-6 py-5">
              <StatusChip value={user.role} tone="neutral" />
            </td>
            <td className="px-6 py-5">
              {user.isActive ? (
                <StatusChip value="ACTIVE" />
              ) : (
                <StatusChip value="INACTIVE" />
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
                  className="inline-flex h-8 w-8 items-center justify-center bg-surface-container-high text-on-surface rounded-md border border-outline-variant/35 hover:bg-surface-container-highest transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  title="View Details"
                  disabled={bulkLoading || actionLoadingId === user.id}
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">visibility</span>
                </button>
                {user.isActive ? (
                  <button
                    onClick={(event) => void handleDeactivate(user.id, event)}
                    className="inline-flex h-8 w-8 items-center justify-center bg-error-container text-on-error-container rounded-md border border-outline-variant/25 hover:brightness-95 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Deactivate"
                    disabled={bulkLoading || actionLoadingId === user.id}
                  >
                    <span className="material-symbols-outlined text-[18px] leading-none">block</span>
                  </button>
                ) : (
                  <button
                    onClick={(event) => void handleActivate(user.id, event)}
                    className="inline-flex h-8 w-8 items-center justify-center bg-tertiary text-on-tertiary rounded-md border border-outline-variant/25 hover:brightness-95 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Activate"
                    disabled={bulkLoading || actionLoadingId === user.id}
                  >
                    <span className="material-symbols-outlined text-[18px] leading-none">check_circle</span>
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      <div className="p-4 border border-outline-variant/15 border-t-0 rounded-b-xl flex items-center justify-between bg-surface-container-low/50 shrink-0">
        <p className="text-xs text-on-surface-variant">Page {pagination.page} of {pagination.totalPages}</p>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          loading={loading}
          onPrev={() => void fetchUsers(pagination.page - 1)}
          onNext={() => void fetchUsers(pagination.page + 1)}
        />
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-inverse-surface/45 backdrop-blur-xs"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative bg-surface-container-lowest rounded-xl shadow-[0px_20px_40px_rgba(42,52,57,0.1)] w-full max-w-md overflow-hidden border border-outline-variant/20">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
              <div>
                <span className="font-label text-xs uppercase tracking-[0.12em] text-on-surface-variant">User Detail</span>
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
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">User ID</label>
                  <p className="text-sm font-mono mt-1">{selectedUser.id}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Role</label>
                  <p className="text-sm mt-1">{selectedUser.role}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Email</label>
                  <p className="text-sm mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Phone</label>
                  <p className="text-sm mt-1">{selectedUser.phone ?? '—'}</p>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Status</label>
                  <div className="mt-1">
                    {selectedUser.isActive ? (
                      <StatusChip value="ACTIVE" />
                    ) : (
                      <StatusChip value="INACTIVE" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="font-label text-xs uppercase tracking-[0.12em] font-semibold text-on-surface-variant">Created At</label>
                  <p className="text-sm mt-1">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low/50 border-t border-outline-variant/20 flex justify-end gap-3">
              {selectedUser.isActive ? (
                <button
                  onClick={() => {
                    void handleDeactivate(selectedUser.id);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-error text-on-error rounded-md text-sm font-bold transition-all hover:brightness-110 disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
                  disabled={actionLoadingId === selectedUser.id || bulkLoading}
                >
                  {actionLoadingId === selectedUser.id ? 'Processing...' : 'Deactivate User'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    void handleActivate(selectedUser.id);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-tertiary text-on-tertiary rounded-md text-sm font-bold transition-all hover:brightness-110 disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
                  disabled={actionLoadingId === selectedUser.id || bulkLoading}
                >
                  {actionLoadingId === selectedUser.id ? 'Processing...' : 'Activate User'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
