'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Tiptap from '@/components/Tiptap';
import { BookOpen, Save, ArrowLeft } from 'lucide-react';

export default function NewStudyCase() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please provide a title for your study case.');
      return;
    }
    
    setSaving(true);
    const res = await fetch('/api/study-cases', {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
    
    if (res.ok) {
      router.push('/study-cases');
    } else {
      setSaving(false);
      const err = await res.json();
      alert('Error saving case: ' + err.error);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={() => router.back()} style={{ padding: '8px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0 }}><BookOpen size={24} style={{ display: 'inline', marginBottom: '-4px' }} /> New Study Case</h2>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary flex-row" onClick={handleSave} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Case'}
          </button>
        </div>
      </div>

      <div className="form-card" style={{ marginBottom: '24px' }}>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="Case Title (e.g. Backtest EUR/USD NY Session)" 
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
