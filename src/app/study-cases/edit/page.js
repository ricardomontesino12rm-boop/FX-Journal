'use client';
import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Tiptap from '@/components/Tiptap';
import { getStudyCase, updateStudyCase } from '@/lib/desktop-api';

function EditStudyCaseQueryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getStudyCase(id).then((data) => {
      setTitle(data.title || '');
      setContent(data.content || '');
      setLoading(false);
    });
  }, [id]);

  if (!id) return <div className="page-container fade-in"><p>Missing study case id.</p></div>;
  if (loading) return <div className="page-container fade-in"><p>Loading case data...</p></div>;

  const save = async () => {
    if (!title.trim()) return;
    await updateStudyCase(id, { title, content });
    router.push('/study-cases');
  };

  return (
    <div className="fade-in">
      <h2>Edit Study Case</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Tiptap onChange={setContent} content={content} />
      <button onClick={save} className="btn btn-primary" style={{ marginTop: '16px' }}>Save Changes</button>
    </div>
  );
}

export default function EditStudyCaseQueryPage() {
  return (
    <Suspense fallback={<div className="page-container fade-in"><p>Loading...</p></div>}>
      <EditStudyCaseQueryPageContent />
    </Suspense>
  );
}
