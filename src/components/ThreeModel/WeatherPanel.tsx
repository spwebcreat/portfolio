import { useState } from 'react'
import type { WeatherCategory, WeatherData } from './weatherTypes'
import { PREVIEW_CATEGORIES, CATEGORY_LABELS } from './weatherTypes'
import styl from './WeatherPanel.module.styl'

interface WeatherPanelProps {
  weather: WeatherData | null
  weatherEnabled: boolean
  onToggleWeather: () => void
  manualOverride: WeatherCategory | null
  onSetManualOverride: (category: WeatherCategory | null) => void
  locationName: string
  onSetLocation: (type: 'tokyo' | 'geolocation') => void
  isLoading: boolean
}

export function WeatherPanel({
  weather,
  weatherEnabled,
  onToggleWeather,
  manualOverride,
  onSetManualOverride,
  locationName,
  onSetLocation,
  isLoading,
}: WeatherPanelProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <>
      {/* Weather info panel (visible only when enabled) */}
      {weatherEnabled && (
        <div className={styl.weatherPanel}>
          {/* Weather status */}
          {weather && (
            <div className={styl.weatherStatus}>
              <span className={styl.weatherIcon}>{weather.display.icon}</span>
              <span className={styl.locationLabel}>{locationName}</span>
              <span className={styl.weatherTemp}>{Math.round(weather.temperature)}&deg;C</span>
              <span className={styl.weatherLabel}>{weather.display.label}</span>
              {manualOverride && <span className={styl.manualBadge}>Manual</span>}
              {isLoading && <span className={styl.weatherLabel}>...</span>}
            </div>
          )}

          {/* Location toggle */}
          <div className={styl.locationRow}>
            <button
              className={styl.locationBtn}
              data-active={locationName === 'Tokyo' || undefined}
              onClick={() => onSetLocation('tokyo')}
            >
              Tokyo
            </button>
            <button
              className={styl.locationBtn}
              data-active={locationName !== 'Tokyo' || undefined}
              onClick={() => onSetLocation('geolocation')}
            >
              My Location
            </button>
            {/* Preview toggle */}
            <button
              className={styl.previewToggle}
              data-open={previewOpen || undefined}
              onClick={() => setPreviewOpen(v => !v)}
            >
              Preview {previewOpen ? '\u25B2' : '\u25BC'}
            </button>
          </div>

          {/* Preview selector */}
          {previewOpen && (
            <div className={styl.previewRow}>
              {PREVIEW_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={styl.previewBtn}
                  data-active={manualOverride === cat || undefined}
                  onClick={() => {
                    // Same category again → clear override
                    onSetManualOverride(manualOverride === cat ? null : cat)
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weather toggle button */}
      <button
        className={styl.weatherToggle}
        onClick={onToggleWeather}
        data-active={weatherEnabled || undefined}
        aria-label="Toggle weather effects"
      >
        {weatherEnabled ? '\uD83C\uDF24 Weather ON' : '\uD83C\uDF24 Weather OFF'}
      </button>
    </>
  )
}
