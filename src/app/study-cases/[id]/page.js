'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Tiptap from '@/components/Tiptap';
import { BookOpen, Save, ArrowLeft, Clock } from 'lucide-react';

export default function EditStudyCase({ params }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/study-cases/${unwrappedParams.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          router.push('/study-cases');
          return;
        }
        setTitle(data.title);
        setContent(data.content);
        setUpdatedAt(data.updated_at);
        setLoading(false);
      })
      .catch(console.error);
  }, [unwrappedParams.id, router]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please provide a title for your study case.');
      return;
    }
    
    setSaving(true);
    const res = await fetch(`/api/study-cases/${unwrappedParams.id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content })
    });
    
    if (res.ok) {
      router.push('/study-cases');
    } else {
      setSaving(false);
      const err = await res.json();
      alert('Error updating case: ' + err.error);
    }
  };

  if (loading) return <div className="page-container fade-in"><p>Loading case data...</p></div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={() => router.back()} style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0 }}><BookOpen size={24} style={{ display: 'inline', marginBottom: '-4px' }} /> Edit Study Case</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} /> Last updated: {new Date(updatedAt).toLocaleString()}
          </span>
          <button className="btn btn-primary flex-row" onClick={handleSave} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="form-card" style={{ marginBottom: '24px' }}>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="Case Title" 
          style={{ 
            width: '100%', 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            background: 'transparent', 
            border: 'none', 
            borderBottom: '2px solid rgba(255,255,255,0.05)', 
            borderRadius: '0',
            padding: '8px 0',
            marginBottom: '24px',
            color: 'var(--text-main)',
            outline: 'none',
            boxShadow: 'none'
          }}
        />
        
        <div style={{ minHeight: '60vh' }}>
          <Tiptap onChange={setContent} content={content} />
        </div>
      </div>
    </div>
  );
}
