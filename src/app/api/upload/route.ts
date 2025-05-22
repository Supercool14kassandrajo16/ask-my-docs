/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {

// 0. load pdfjs-dist (no worker)
  const pdfjsLib = await import(
  /* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs'
);
// turn off both real and fake workers
;(pdfjsLib.GlobalWorkerOptions as any).disableWorker = true;
  const { getDocument } = pdfjsLib;


    // 1. grab the file
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'no file provided' }, { status: 400 });
    }

    // 2. extract text via pdfjs-dist
    const buffer = Buffer.from(await file.arrayBuffer());
    const uint8 = new Uint8Array(buffer);
    const pdfDoc = await getDocument({ data: uint8 }).promise;
    let text = '';
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map((i: any) => i.str).join(' ') + '\n';
    }

    // 3. chunk + embed + collect…
    const docId = crypto.randomUUID();
    const rows: any[] = [];
    for (let i = 0; i < text.length; i += 1500) {
      const chunk = text.slice(i, i + 1500);
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      });
      rows.push({
        doc_id: docId,
        chunk_index: i,
        content: chunk,
        embedding: emb.data[0].embedding,
      });
    }

    // 4. insert
    const { error } = await supabase.from('doc_chunks').insert(rows);
    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    return NextResponse.json({ inserted: rows.length, docId });
  } catch (err: any) {
    console.error('📤 upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
