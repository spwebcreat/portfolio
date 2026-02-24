import { useState, useEffect, useCallback, useRef } from 'react'
import {
  type WeatherCategory,
  type WeatherData,
  mapWmoToCategory,
  getWeatherDisplay,
  WEATHER_MULTIPLIERS,
} from './weatherTypes'

// --- Module-level cache (TTL 30 min) ---
interface CacheEntry {
  data: WeatherData
  timestamp: number
  lat: number
  lon: number
}

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes
let cachedEntry: CacheEntry | null = null

function getCached(lat: number, lon: number): WeatherData | null {
  if (
    cachedEntry &&
    cachedEntry.lat === lat &&
    cachedEntry.lon === lon &&
    Date.now() - cachedEntry.timestamp < CACHE_TTL
  ) {
    return cachedEntry.data
  }
  return null
}

function setCache(lat: number, lon: number, data: WeatherData) {
  cachedEntry = { data, timestamp: Date.now(), lat, lon }
}

// Default location: Tokyo
const TOKYO = { lat: 35.6762, lon: 139.6503, name: 'Tokyo' }

const STORAGE_KEY = 'sp-weather-location'

interface LocationState {
  lat: number
  lon: number
  name: string
}

function loadStoredLocation(): LocationState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed.lat === 'number' &&
      typeof parsed.lon === 'number' &&
      typeof parsed.name === 'string' &&
      parsed.name !== 'Tokyo'
    ) {
      return parsed as LocationState
    }
  } catch { /* ignore */ }
  return null
}

function saveStoredLocation(loc: LocationState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
  } catch { /* ignore */ }
}

function clearStoredLocation() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

export interface UseWeatherOptions {
  enabled: boolean
  manualOverride: WeatherCategory | null
}

export interface UseWeatherReturn {
  weather: WeatherData | null
  location: LocationState
  isLoading: boolean
  isGeolocating: boolean
  error: string | null
  setLocation: (type: 'tokyo' | 'geolocation') => void
  refetch: () => void
}

// Reverse geocoding: coordinates → city name (with 1 retry)
async function reverseGeocode(lat: number, lon: number, retries = 1): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ja&zoom=10`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'sp-webcreat-portfolio/1.0' },
    })
    if (!res.ok) throw new Error('Geocoding failed')
    const json = await res.json()
    const addr = json.address
    // Prefer city → city_district(区) → municipality → town → village → county → state
    const name = addr?.city || addr?.city_district || addr?.municipality
      || addr?.town || addr?.village || addr?.county || addr?.state
    if (name) return name
    throw new Error('No address fields found')
  } catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000))
      return reverseGeocode(lat, lon, retries - 1)
    }
    throw e
  }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`)
  const json = await res.json()
  const cw = json.current_weather
  const wmoCode: number = cw.weathercode
  const category = mapWmoToCategory(wmoCode)
  return {
    category,
    multipliers: WEATHER_MULTIPLIERS[category],
    display: getWeatherDisplay(wmoCode),
    temperature: cw.temperature,
    windSpeed: cw.windspeed,
    wmoCode,
  }
}

export function useWeather({ enabled, manualOverride }: UseWeatherOptions): UseWeatherReturn {
  const [location, setLocationState] = useState<LocationState>(() => loadStoredLocation() ?? TOKYO)
  const [apiWeather, setApiWeather] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeolocating, setIsGeolocating] = useState(false)
  const isGeolocatingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async (loc: LocationState) => {
    const cached = getCached(loc.lat, loc.lon)
    if (cached) {
      setApiWeather(cached)
      setError(null)
      return
    }

    const id = ++fetchIdRef.current
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchWeather(loc.lat, loc.lon)
      if (id !== fetchIdRef.current) return // stale
      setCache(loc.lat, loc.lon, data)
      setApiWeather(data)
    } catch (e) {
      if (id !== fetchIdRef.current) return
      setError(e instanceof Error ? e.message : 'Unknown error')
      setApiWeather(null)
    } finally {
      if (id === fetchIdRef.current) setIsLoading(false)
    }
  }, [])

  // Fetch on mount and when location changes
  useEffect(() => {
    if (!enabled) return
    doFetch(location)
  }, [enabled, location, doFetch])

  const setLocation = useCallback((type: 'tokyo' | 'geolocation') => {
    if (type === 'tokyo') {
      setLocationState(TOKYO)
      clearStoredLocation()
      return
    }

    // Guard: prevent duplicate geolocation requests
    if (isGeolocatingRef.current) return

    if (!navigator.geolocation) {
      setLocationState(TOKYO)
      return
    }

    isGeolocatingRef.current = true
    setIsGeolocating(true)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000
        const lon = Math.round(pos.coords.longitude * 10000) / 10000
        // Set immediately with temporary name, then resolve city name
        setLocationState({ lat, lon, name: '...' })
        try {
          const name = await reverseGeocode(lat, lon)
          const resolved = { lat, lon, name }
          setLocationState((prev) =>
            prev.lat === lat && prev.lon === lon ? resolved : prev
          )
          saveStoredLocation(resolved)
        } catch {
          const fallback = { lat, lon, name: 'My Location' }
          setLocationState((prev) =>
            prev.lat === lat && prev.lon === lon ? fallback : prev
          )
          // Don't persist generic fallback — next visit should retry geocoding
        } finally {
          isGeolocatingRef.current = false
          setIsGeolocating(false)
        }
      },
      () => {
        // Denied or timeout → fallback to Tokyo
        setLocationState(TOKYO)
        isGeolocatingRef.current = false
        setIsGeolocating(false)
      },
      { timeout: 8000 }
    )
  }, [])

  const refetch = useCallback(() => {
    // Clear cache and re-fetch
    cachedEntry = null
    doFetch(location)
  }, [location, doFetch])

  // Manual override: synthesize WeatherData from the category
  const weather: WeatherData | null = (() => {
    if (!enabled) return null
    if (manualOverride) {
      const multipliers = WEATHER_MULTIPLIERS[manualOverride]
      const fakeCode = manualOverride === 'clear' ? 0
        : manualOverride === 'clouds' ? 3
        : manualOverride === 'fog' ? 45
        : manualOverride === 'rain' ? 61
        : manualOverride === 'thunderstorm' ? 95
        : manualOverride === 'snow' ? 71
        : 0
      return {
        category: manualOverride,
        multipliers,
        display: getWeatherDisplay(fakeCode),
        temperature: apiWeather?.temperature ?? 0,
        windSpeed: apiWeather?.windSpeed ?? 5,
        wmoCode: fakeCode,
      }
    }
    return apiWeather
  })()

  return { weather, location, isLoading, isGeolocating, error, setLocation, refetch }
}
