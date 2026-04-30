'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Image as ImageIcon, Bold, Italic, List, Heading2 } from 'lucide-react';
import { useRef } from 'react';
import { uploadImage as uploadImageCommand } from '@/lib/desktop-api';

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
              handleImageUpload(file);
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

  const handleImageUpload = async (file) => {
    try {
      const bytes = await file.arrayBuffer();
      const binary = new Uint8Array(bytes);
      let binaryString = '';
      for (const byte of binary) binaryString += String.fromCharCode(byte);
      const base64Data = btoa(binaryString);

      const data = await uploadImageCommand({
        file_name: file.name,
        mime_type: file.type || 'image/png',
        base64_data: base64Data,
        trade_id: null,
        description: ''
      });
      editor.chain().focus().setImage({ src: data.file_path }).run();
    } catch (error) {
      console.error('Image upload failed', error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
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
