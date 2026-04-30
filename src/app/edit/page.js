'use client';
import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Tiptap from '@/components/Tiptap';
import { getAccounts, getTags, getTradeById, updateTrade } from '@/lib/desktop-api';

function toDateTimeLocalValue(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function EditTradeQueryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [accounts, setAccounts] = useState([]);
  const [tagOptions, setTagOptions] = useState({ sessions: [], setups: [], mistakes: [] });
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    account_id: '', pair: '', direction: 'long', pnl_net: '', pnl_percentage: '', status: 'open',
    session: '', setup: '', mistake: '', rr_ratio: '', entry_date: '', notes: '', psychology_score: 5
  });

  useEffect(() => {
    if (!id) return;
    getAccounts().then(setAccounts);
    getTags().then((data) => setTagOptions(data || { sessions: [], setups: [], mistakes: [] }));
    getTradeById(id).then((trade) => {
      setFormData({
        account_id: trade.account_id, pair: trade.pair, direction: trade.direction,
        pnl_net: trade.pnl_net ?? '', pnl_percentage: trade.pnl_percentage ?? '', status: trade.status,
        session: trade.session || '', setup: trade.setup || '', mistake: trade.mistake || '',
        rr_ratio: trade.rr_ratio ?? '', entry_date: toDateTimeLocalValue(trade.entry_date),
        notes: trade.notes || '', psychology_score: trade.psychology_score
      });
      setLoading(false);
    });
  }, [id]);

  if (!id) return <div className="page-container fade-in"><p>Missing trade id.</p></div>;
  if (loading) return <div className="page-container fade-in"><p>Loading trade data...</p></div>;

  const save = async (e) => {
    e.preventDefault();
    try {
      await updateTrade(id, {
        ...formData,
        account_id: Number(formData.account_id),
        pnl_net: formData.pnl_net !== '' ? parseFloat(formData.pnl_net) : null,
        pnl_percentage: formData.pnl_percentage !== '' ? parseFloat(formData.pnl_percentage) : null,
        rr_ratio: formData.rr_ratio !== '' ? parseFloat(formData.rr_ratio) : null,
        psychology_score: parseInt(formData.psychology_score)
      });
      router.push(`/trades/detail?id=${id}`);
    } catch (error) {
      alert(`Error updating trade: ${error.message}`);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Edit Trade</h2>
      <form onSubmit={save}>
        <input value={formData.pair} onChange={(e) => setFormData({ ...formData, pair: e.target.value })} required />
        <input type="datetime-local" value={formData.entry_date} onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} required />
        <select value={formData.account_id} onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}>
          {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
        </select>
        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
          {['open', 'win', 'loss', 'breakeven'].map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <input type="number" value={formData.pnl_net} onChange={(e) => setFormData({ ...formData, pnl_net: e.target.value })} placeholder="P&L Net" />
        <input type="number" value={formData.pnl_percentage} onChange={(e) => setFormData({ ...formData, pnl_percentage: e.target.value })} placeholder="P&L %" />
        <input type="number" value={formData.rr_ratio} onChange={(e) => setFormData({ ...formData, rr_ratio: e.target.value })} placeholder="RRR" />
        <Tiptap onChange={(notes) => setFormData({ ...formData, notes })} content={formData.notes} />
        <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>Save Changes</button>
      </form>
    </div>
  );
}

export default function EditTradeQueryPage() {
  return (
    <Suspense fallback={<div className="page-container fade-in"><p>Loading...</p></div>}>
      <EditTradeQueryPageContent />
    </Suspense>
  );
}
