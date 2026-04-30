'use client';
import { useState, useEffect, useRef } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toPng } from 'html-to-image';
import { ArrowLeft, Edit, Trash2, Printer, Image as ImageIcon } from 'lucide-react';
import { deleteTrade, getTradeById } from '@/lib/desktop-api';

function TradeDetailQueryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const tradeRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    getTradeById(id).then((data) => {
      setTrade(data);
      setLoading(false);
    });
  }, [id]);

  if (!id) return <div className="page-container fade-in"><p>Missing trade id.</p></div>;
  if (loading) return <div className="page-container fade-in"><p>Loading...</p></div>;

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this trade?')) {
      await deleteTrade(id);
      router.push('/trades');
    }
  };

  const handleDownloadPNG = async () => {
    if (!tradeRef.current) return;
    const dataUrl = await toPng(tradeRef.current, { cacheBust: true, backgroundColor: 'var(--bg-color)' });
    const link = document.createElement('a');
    link.download = `${trade.pair.replace('/', '-')}_trade.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="fade-in">
      <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '24px' }}>
        <Link href="/trades" className="btn btn-secondary"><ArrowLeft size={16} /> Back to Trades</Link>
        <div className="flex-row" style={{ gap: '12px' }}>
          <button onClick={handleDownloadPNG} className="btn btn-secondary"><ImageIcon size={16} /> PNG</button>
          <button onClick={() => window.print()} className="btn btn-secondary"><Printer size={16} /> PDF</button>
          <Link href={`/edit?id=${id}`} className="btn btn-secondary"><Edit size={16} /> Edit</Link>
          <button onClick={handleDelete} className="btn"><Trash2 size={16} /> Delete</button>
        </div>
      </div>
      <div ref={tradeRef} className="glass-panel">
        <h2>{trade.pair}</h2>
        <p>{trade.account_name} - {trade.status} - {trade.direction}</p>
        <p>{trade.pnl_net ? `$${trade.pnl_net.toFixed(2)}` : '$0.00'}</p>
        <div className="ProseMirror" dangerouslySetInnerHTML={{ __html: trade.notes || '' }} />
      </div>
    </div>
  );
}

export default function TradeDetailQueryPage() {
  return (
    <Suspense fallback={<div className="page-container fade-in"><p>Loading...</p></div>}>
      <TradeDetailQueryPageContent />
    </Suspense>
  );
}
