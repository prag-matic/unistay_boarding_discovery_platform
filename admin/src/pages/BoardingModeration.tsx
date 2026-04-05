import { useEffect, useState } from 'react';
import { api, Boarding } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import BoardingDetailDrawer from '../components/BoardingDetailDrawer';

export default function BoardingModeration() {
  const [boardings, setBoardings] = useState<Boarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoarding, setSelectedBoarding] = useState<Boarding | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBoardings = async () => {
    setLoading(true);
    try {
      const res = await api.getPendingBoardings();
      if (res.success) {
        setBoardings(res.data.boardings);
      }
    } catch (error) {
      console.error('Failed to fetch boardings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardings();
  }, []);

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.approveBoarding(id);
      fetchBoardings();
      if (selectedBoarding?.id === id) {
        setSelectedBoarding(null);
      }
    } catch (error) {
      console.error('Failed to approve', error);
    }
  };

  const handleReject = async (id: string, reason: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.rejectBoarding(id, reason);
      fetchBoardings();
      if (selectedBoarding?.id === id) {
        setSelectedBoarding(null);
      }
    } catch (error) {
      console.error('Failed to reject', error);
    }
  };

  const filteredBoardings = boardings.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto thin-scrollbar">
      {/* Header Section */}
      <section className="shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="font-label text-xs uppercase tracking-[0.15em] text-primary mb-1">Queue Management</p>
          <div className="flex items-baseline gap-4">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface">Boarding Moderation</h2>
            <span className="text-sm font-medium bg-primary-container text-on-primary-container px-3 py-1 rounded-full">
              {filteredBoardings.length} listings pending review
            </span>
          </div>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input 
            type="text" 
            placeholder="Search moderation queue..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-full text-sm focus:ring-1 focus:ring-primary w-full md:w-64 outline-none shadow-sm" 
          />
        </div>
      </section>

      {/* Data Table Container */}
      <section className="bg-surface-container-lowest rounded-xl overflow-hidden flex-1 shadow-[0px_20px_40px_rgba(42,52,57,0.04)] flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container-low z-10">
              <tr className="border-b border-outline-variant/15 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                <th className="px-6 py-4 font-bold">Boarding ID</th>
                <th className="px-6 py-4 font-bold">Title</th>
                <th className="px-6 py-4 font-bold">Owner Details</th>
                <th className="px-6 py-4 font-bold">Location</th>
                <th className="px-6 py-4 font-bold text-right">Monthly Rent</th>
                <th className="px-6 py-4 font-bold">Updated At</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">Loading...</td>
                </tr>
              ) : filteredBoardings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">No pending boardings found.</td>
                </tr>
              ) : (
                filteredBoardings.map((boarding) => (
                  <tr 
                    key={boarding.id}
                    onClick={() => setSelectedBoarding(boarding)}
                    className={`transition-colors cursor-pointer group ${selectedBoarding?.id === boarding.id ? 'bg-surface-container-high/30' : 'hover:bg-surface-container-high'}`}
                  >
                    <td className="px-6 py-5 font-mono text-xs text-on-surface-variant">{boarding.id}</td>
                    <td className="px-6 py-5 font-bold text-sm text-on-surface">{boarding.title}</td>
                    <td className="px-6 py-5">
                      <div className="text-sm">{boarding.ownerName}</div>
                      <div className="text-xs text-on-surface-variant">{boarding.ownerPhone}</div>
                    </td>
                    <td className="px-6 py-5 text-sm">{boarding.location}</td>
                    <td className="px-6 py-5 text-right font-mono font-medium text-sm">
                      LKR {boarding.monthlyRent.toLocaleString()}
                    </td>
                    <td className="px-6 py-5 text-xs text-on-surface-variant">
                      {formatDistanceToNow(new Date(boarding.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-5">
                      <span className="bg-error-container/20 text-on-error-container text-[10px] font-bold px-2 py-1 rounded-sm">
                        {boarding.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBoarding(boarding);
                          }}
                          className="p-1.5 bg-surface-variant text-on-surface-variant rounded-md hover:scale-110 transition-transform"
                          title="View"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Adapter */}
        <div className="mt-auto p-4 border-t border-outline-variant/15 flex items-center justify-between bg-surface-container-low/50 shrink-0">
          <p className="text-xs text-on-surface-variant">Showing 1 to {boardings.length} of {boardings.length} entries</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded text-xs font-medium hover:bg-surface-variant disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 bg-primary text-on-primary rounded text-xs font-medium">1</button>
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/30 rounded text-xs font-medium hover:bg-surface-variant disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </section>

      <BoardingDetailDrawer 
        boarding={selectedBoarding} 
        onClose={() => setSelectedBoarding(null)} 
        onApprove={() => selectedBoarding && handleApprove(selectedBoarding.id)}
        onReject={(reason) => selectedBoarding && handleReject(selectedBoarding.id, reason)}
      />
    </div>
  );
}
