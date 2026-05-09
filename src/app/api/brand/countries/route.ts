import { NextResponse } from 'next/server'
import { getSupportedCountries } from '@/lib/calendar'

export async function GET() {
  return NextResponse.json({ countries: getSupportedCountries() })
}
