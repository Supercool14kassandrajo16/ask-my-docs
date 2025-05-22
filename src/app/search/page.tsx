'use client';
import { useState } from 'react';

interface Chunk {
  id: string;
  doc_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Chunk[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);


async function handleSearch() {
  setErr(null);
  setLoading(true);
  const res = await fetch('/api/search', {
    /* … */
  });
  const json = await res.json();
  setLoading(false);
  if (json.error) {
    setErr(json.error);
  } else {
    setResults(json.results);
  }
}


  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Search Documents</h1>

      <div className="space-x-2">
        <input
          className="border p-2 rounded w-2/3"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type a query…"
          onKeyDown={e => {
  if (e.key === 'Enter' && query.trim() && !loading) {
    handleSearch();
  }
}}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-40"
        >
          Search
        </button>
      </div>

      {err && <p className="text-red-500">Error: {err}</p>}

    
      {!loading && query.trim() && results.length === 0 && (
  <p className="text-gray-500">No results found.</p>
)}


      <ul className="space-y-4">
        {results.map(r => (
          <li key={r.id} className="p-4 border rounded">
            <p><strong>Score:</strong> {r.similarity.toFixed(3)}</p>
            <p>{r.content}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
