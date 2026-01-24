import { NextRequest } from 'next/server'

interface GeoLocationResult {
  countryCode: string
  country: string
  isNigeria: boolean
}

// Simple in-memory cache to avoid excessive API calls
const cache = new Map<string, { result: GeoLocationResult; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

/**
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string | null {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP.trim()
  }

  if (cfConnectingIP) {
    return cfConnectingIP.trim()
  }

  return null
}

/**
 * Detect country from IP address using ip-api.com (free tier)
 * Falls back to ipapi.co if needed
 */
async function detectCountryFromIP(ip: string): Promise<GeoLocationResult> {
  // Check cache first
  const cached = cache.get(ip)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
  }

  try {
    // Try ip-api.com first (free, no API key needed, 45 requests/minute)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      
      if (data.status === 'success' && data.countryCode) {
        const result: GeoLocationResult = {
          countryCode: data.countryCode,
          country: data.country,
          isNigeria: data.countryCode === 'NG',
        }
        
        // Cache the result
        cache.set(ip, { result, timestamp: Date.now() })
        return result
      }
    }
  } catch (error) {
    console.error('Error fetching from ip-api.com:', error)
  }

  // Fallback: try ipapi.co (requires API key but has free tier)
  try {
    const apiKey = process.env.IPAPI_KEY
    const url = apiKey 
      ? `https://ipapi.co/${ip}/json/?key=${apiKey}`
      : `https://ipapi.co/${ip}/json/`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      
      if (data.country_code) {
        const result: GeoLocationResult = {
          countryCode: data.country_code,
          country: data.country_name || data.country_code,
          isNigeria: data.country_code === 'NG',
        }
        
        // Cache the result
        cache.set(ip, { result, timestamp: Date.now() })
        return result
      }
    }
  } catch (error) {
    console.error('Error fetching from ipapi.co:', error)
  }

  // Default fallback: assume not Nigeria (safer for payment routing)
  const defaultResult: GeoLocationResult = {
    countryCode: 'US',
    country: 'Unknown',
    isNigeria: false,
  }
  
  cache.set(ip, { result: defaultResult, timestamp: Date.now() })
  return defaultResult
}

/**
 * Detect user country from request
 * Returns country information including whether user is from Nigeria
 */
export async function detectUserCountry(request: NextRequest): Promise<GeoLocationResult> {
  const ip = getClientIP(request)
  console.log("Detected IP:", ip)
  
  if (!ip) {
    // If we can't get IP, default to non-Nigeria (use PayPal)
    return {
      countryCode: 'US',
      country: 'Unknown',
      isNigeria: false,
    }
  }

  // Skip detection for localhost/private IPs (development)
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    // In development, you can set an environment variable to force a country
    const devCountry = process.env.DEV_COUNTRY_CODE
    if (devCountry) {
      return {
        countryCode: devCountry,
        country: devCountry === 'NG' ? 'Nigeria' : 'Development',
        isNigeria: devCountry === 'NG',
      }
    }
    // Default to non-Nigeria in development
    return {
      countryCode: 'US',
      country: 'Development',
      isNigeria: false,
    }
  }

  return await detectCountryFromIP(ip)
}

/**
 * Client-side country detection (optional, for price display)
 * Uses a simple API endpoint
 */
export async function detectCountryClient(): Promise<GeoLocationResult> {
  try {
    const response = await fetch('/api/geo/detect', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Error detecting country on client:', error)
  }

  // Default fallback
  return {
    countryCode: 'US',
    country: 'Unknown',
    isNigeria: false,
  }
}
