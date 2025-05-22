import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/search
export async function POST(req: Request) {
  // 1. parse the incoming JSON body
  const { query } = await req.json();
  if (typeof query !== 'string' || !query.trim()) {
    return NextResponse.json({ error: 'missing query' }, { status: 400 });
  }

  // 2. get an embedding for the query
  const embRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const [query_embedding] = embRes.data.map(d => d.embedding);

  // 3. call our match_doc_chunks RPC
  const { data, error } = await supabase
    .rpc('match_doc_chunks', {
      query_embedding,
      match_count: 5,
    });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4. return the matched chunks
  return NextResponse.json({ results: data });
}
