'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Image as ImageIcon, Bold, Italic, List, Heading2 } from 'lucide-react';
import { useRef } from 'react';

export default function Tiptap({ content, onChange }) {
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none custom-tiptap-editor',
      },
      handlePaste: (view, event, slice) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            if (file) {
              uploadImage(file);
              return true; // Stop default paste
            }
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const uploadImage = async (file) => {
    // You could just insert base64 if it's small, but we will upload to API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tradeId', 'temp'); // We might not have tradeId yet, this is fine
    
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (res.ok) {
      const data = await res.json();
      editor.chain().focus().setImage({ src: data.image.file_path }).run();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadImage(e.target.files[0]);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-container">
      <div className="tiptap-toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}>
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}>
          <Italic size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}>
          <Heading2 size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'active' : ''}>
          <List size={16} />
        </button>
        <div className="toolbar-divider"></div>
        <button type="button" onClick={() => fileInputRef.current?.click()} title="Insert Image (or Paste directly)">
          <ImageIcon size={16} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
          accept="image/*" 
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
