/* eslint-disable @typescript-eslint/no-explicit-any */



import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    // 0. load pdf-parse at runtime (avoids webpack issues)
    const { default: pdfParse } = await import('pdf-parse');

    // 1. grab the file
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'no file provided' }, { status: 400 });
    }

    // 2. extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await pdfParse(buffer);

    // 3. chunk → embed → collect rows…
    const CHUNK_SIZE = 1500;
    const docId = crypto.randomUUID();
    const rows = [] as any[];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      const chunk = text.slice(i, i + CHUNK_SIZE);
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      });
      rows.push({
        doc_id:     docId,
        chunk_index:i,
        content:    chunk,
        embedding:  emb.data[0].embedding,
      });
    }

    // 4. insert into Supabase
    const { error } = await supabase.from('doc_chunks').insert(rows);
    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    return NextResponse.json({ inserted: rows.length, docId });
  } catch (err: any) {
    // log it so it shows up in Vercel runtime logs…
    console.error('📤 upload error:', err);
    // …and return it as JSON to the client
    return NextResponse.json(
      { error: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
