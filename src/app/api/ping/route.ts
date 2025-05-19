import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { error } = await supabase.auth.getSession();
  return NextResponse.json({ ok: !error, error });
}
