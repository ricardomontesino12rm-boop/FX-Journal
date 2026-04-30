'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Clock, Trash2 } from 'lucide-react';
import { deleteStudyCase, getStudyCases } from '@/lib/desktop-api';

export default function StudyCases() {
  const router = useRouter();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudyCases()
      .then(data => {
        setCases(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleDelete = async (e, id, title) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the study case "${title}"?`)) {
      try {
        await deleteStudyCase(id);
        setCases(cases.filter(c => c.id !== id));
      } catch (error) {
        alert(error.message);
      }
    }
  };

  if (loading) return <div className="page-container fade-in"><p>Loading cases...</p></div>;

  return (
    <div className="fade-in">
      <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: '32px' }}>
        <h2><BookOpen size={24} style={{ display: 'inline', marginBottom: '-4px', marginRight: '8px' }} /> Study Cases</h2>
        <button className="btn btn-primary flex-row" onClick={() => router.push('/study-cases/new')}>
          <Plus size={18} /> New Case
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <BookOpen size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>No Study Cases Yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Create your first study case to document a setup, backtest, or strategy idea.</p>
          <button className="btn btn-primary" onClick={() => router.push('/study-cases/new')}>
            Create Case
          </button>
        </div>
      ) : (
        <div className="form-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {cases.map(c => (
            <div key={c.id} className="form-card" style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.2s' }} 
                 onClick={() => router.push(`/study-cases/edit?id=${c.id}`)}
                 onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                 onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', lineHeight: '1.4' }}>{c.title}</h3>
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <Clock size={14} />
                  {new Date(c.updated_at).toLocaleDateString()}
                </div>
                <button 
                  onClick={(e) => handleDelete(e, c.id, c.title)} 
                  className="btn" 
                  style={{ background: 'transparent', color: 'var(--danger)', padding: '4px' }}
                  title="Delete case"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
