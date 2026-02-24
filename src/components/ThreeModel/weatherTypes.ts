// Weather API integration - Type definitions & constants

export type WeatherCategory = 'clear' | 'clouds' | 'fog' | 'rain' | 'thunderstorm' | 'snow'

export interface WeatherMultipliers {
  ambientIntensity: number
  dirIntensity: number
  cyanBoost: number
  cloudOpacityBoost: number
  rainIntensity: number
}

export interface WeatherDisplay {
  icon: string
  label: string
}

export interface WeatherData {
  category: WeatherCategory
  multipliers: WeatherMultipliers
  display: WeatherDisplay
  temperature: number
  windSpeed: number
  wmoCode: number
}

// WMO Weather interpretation codes → category
// https://open-meteo.com/en/docs
export function mapWmoToCategory(code: number): WeatherCategory {
  if (code === 0 || code === 1) return 'clear'
  if (code === 2 || code === 3) return 'clouds'
  if (code >= 45 && code <= 48) return 'fog'
  if (code >= 51 && code <= 67) return 'rain'       // drizzle + rain + freezing rain
  if (code >= 71 && code <= 77) return 'snow'        // snow fall + snow grains
  if (code >= 80 && code <= 82) return 'rain'        // rain showers
  if (code >= 85 && code <= 86) return 'snow'        // snow showers
  if (code >= 95 && code <= 99) return 'thunderstorm'
  return 'clear' // fallback
}

export function getWeatherDisplay(code: number): WeatherDisplay {
  const category = mapWmoToCategory(code)
  const displays: Record<WeatherCategory, WeatherDisplay> = {
    clear:        { icon: '\u2600\uFE0F', label: '\u5FEB\u6674' },
    clouds:       { icon: '\u2601\uFE0F', label: '\u66C7\u308A' },
    fog:          { icon: '\uD83C\uDF2B\uFE0F', label: '\u9727' },
    rain:         { icon: '\uD83C\uDF27\uFE0F', label: '\u96E8' },
    thunderstorm: { icon: '\u26C8\uFE0F', label: '\u96F7\u96E8' },
    snow:         { icon: '\u2744\uFE0F', label: '\u96EA' },
  }
  return displays[category]
}

export const WEATHER_MULTIPLIERS: Record<WeatherCategory, WeatherMultipliers> = {
  clear: {
    ambientIntensity: 1.1,
    dirIntensity: 1.0,
    cyanBoost: 1.0,
    cloudOpacityBoost: 0.00,
    rainIntensity: 0.0,
  },
  clouds: {
    ambientIntensity: 0.85,
    dirIntensity: 0.7,
    cyanBoost: 0.95,
    cloudOpacityBoost: 0.08,
    rainIntensity: 0.0,
  },
  fog: {
    ambientIntensity: 0.75,
    dirIntensity: 0.5,
    cyanBoost: 0.9,
    cloudOpacityBoost: 0.12,
    rainIntensity: 0.0,
  },
  rain: {
    ambientIntensity: 0.65,
    dirIntensity: 0.4,
    cyanBoost: 0.85,
    cloudOpacityBoost: 0.15,
    rainIntensity: 1.0,
  },
  thunderstorm: {
    ambientIntensity: 0.5,
    dirIntensity: 0.25,
    cyanBoost: 0.7,
    cloudOpacityBoost: 0.20,
    rainIntensity: 1.0,
  },
  snow: {
    ambientIntensity: 0.8,
    dirIntensity: 0.6,
    cyanBoost: 1.1,
    cloudOpacityBoost: 0.10,
    rainIntensity: 0.0,
  },
}

// Preview categories available in Phase 1
export const PREVIEW_CATEGORIES: WeatherCategory[] = ['clear', 'clouds', 'rain', 'fog']

export const CATEGORY_LABELS: Record<WeatherCategory, string> = {
  clear: 'Clear',
  clouds: 'Clouds',
  fog: 'Fog',
  rain: 'Rain',
  thunderstorm: 'Storm',
  snow: 'Snow',
}
