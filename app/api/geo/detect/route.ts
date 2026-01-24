import { NextRequest, NextResponse } from 'next/server'
import { detectUserCountry } from '@/lib/geo-location'

export async function GET(request: NextRequest) {
  try {
    const geoResult = await detectUserCountry(request)
    return NextResponse.json(geoResult)
  } catch (error: any) {
    console.error('Error detecting country:', error)
    return NextResponse.json(
      {
        countryCode: 'US',
        country: 'Unknown',
        isNigeria: false,
      },
      { status: 200 } // Return default instead of error
    )
  }
}
