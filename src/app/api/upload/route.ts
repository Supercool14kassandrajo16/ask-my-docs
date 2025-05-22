/* eslint-disable @typescript-eslint/no-explicit-any */



import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  /* ---------- 1. grab the file ---------- */
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'no file' }, { status: 400 });
  }

  /* ---------- 2. extract text with pdf-js ---------- */
  (globalThis as any).DOMMatrix ??= class DOMMatrix {};
  const { getDocument } = await import(
  /* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs'
);
  const buffer = Buffer.from(await file.arrayBuffer());
  const pdfData = new Uint8Array(buffer);
  const pdfDoc  = await getDocument({ data: pdfData }).promise;

  let text = '';
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page  = await pdfDoc.getPage(p);
    const tcontent = await page.getTextContent();
    const pageText = tcontent.items.map((it: any) => it.str).join(' ');
    text += pageText + '\n';
  }

  /* ---------- 3. chunk (~1500 chars ≈ 500 tokens) ---------- */
  const CH_SIZE = 1500;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CH_SIZE) {
    chunks.push(text.slice(i, i + CH_SIZE));
  }

  /* ---------- 4. embed & collect rows ---------- */
  const docId = crypto.randomUUID();
  const rows: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunks[i],
    });
    rows.push({
      doc_id: docId,
      chunk_index: i,
      content: chunks[i],
      embedding: emb.data[0].embedding as unknown as number[],
    });
  }

  /* ---------- 5. store in Supabase ---------- */
  const { error } = await supabase.from('doc_chunks').insert(rows);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: rows.length, docId });
}
