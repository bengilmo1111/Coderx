/**
 * PIN check for the parent view. The PIN lives in the server environment so it
 * isn't sitting in the client bundle for a curious 8-year-old to read.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let pin = '';
  try {
    ({ pin } = (await request.json()) as { pin: string });
  } catch {
    return NextResponse.json({ ok: false });
  }
  const expected = process.env.GROWNUP_PIN ?? '1234';
  return NextResponse.json({ ok: String(pin) === expected });
}
