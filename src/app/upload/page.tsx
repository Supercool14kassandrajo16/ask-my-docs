'use client';
import { useState } from 'react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg]   = useState('');

  async function handleUpload() {
    if (!file) return;
    setMsg('⏳ Uploading…');
    const body = new FormData();
    body.append('file', file);
    try {
      const res  = await fetch('/api/upload', { method: 'POST', body });
      const data = await res.json();
      setMsg(JSON.stringify(data, null, 2));
    } catch (err) {
      setMsg('❌ ' + (err as Error).message);
    }
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Upload a PDF</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
      />

      <button
        onClick={handleUpload}
        disabled={!file}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-40"
      >
        Upload
      </button>

      {msg && <pre className="bg-gray-100 p-3 rounded">{msg}</pre>}
    </main>
  );
}
