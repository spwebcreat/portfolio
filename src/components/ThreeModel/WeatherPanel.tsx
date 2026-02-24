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
  isGeolocating: boolean
  isMobile: boolean
  timeLightingEnabled: boolean
  onToggleTimeLighting: () => void
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
  isGeolocating,
  isMobile,
  timeLightingEnabled,
  onToggleTimeLighting,
}: WeatherPanelProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)

  // --- Mobile layout ---
  if (isMobile) {
    if (!mobileExpanded) {
      return (
        <div className={styl.mobileControls}>
          <div className={styl.mobileIcons}>
            <button
              className={styl.mobileIconBtn}
              data-active={weatherEnabled || undefined}
              onClick={() => setMobileExpanded(true)}
              aria-label="Open weather panel"
            >
              {weatherEnabled && weather ? weather.display.icon : '\uD83C\uDF24'}
            </button>
            <button
              className={styl.mobileIconBtn}
              data-active={timeLightingEnabled || undefined}
              onClick={onToggleTimeLighting}
              aria-label="Toggle time-based lighting"
            >
              {'\uD83D\uDD50'}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={styl.mobilePanel}>
        <div className={styl.mobilePanelHeader}>
          <span className={styl.mobilePanelTitle}>Controls</span>
          <button
            className={styl.mobileClose}
            onClick={() => setMobileExpanded(false)}
            aria-label="Close panel"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Toggle row */}
        <div className={styl.mobileToggleRow}>
          <button
            className={styl.mobileToggleBtn}
            data-active={weatherEnabled || undefined}
            onClick={onToggleWeather}
          >
            {weatherEnabled ? '\uD83C\uDF24 Weather ON' : '\uD83C\uDF24 Weather OFF'}
          </button>
          <button
            className={styl.mobileToggleBtn}
            data-active={timeLightingEnabled || undefined}
            onClick={onToggleTimeLighting}
          >
            {timeLightingEnabled ? '\uD83D\uDD50 Time ON' : '\uD83D\uDD50 Time OFF'}
          </button>
        </div>

        {/* Weather details (when enabled) */}
        {weatherEnabled && (
          <>
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
                data-active={(locationName !== 'Tokyo' && !isGeolocating) || undefined}
                disabled={isGeolocating}
                onClick={() => onSetLocation('geolocation')}
              >
                {isGeolocating ? 'Locating...' : 'My Location'}
              </button>
              <button
                className={styl.previewToggle}
                data-open={previewOpen || undefined}
                onClick={() => setPreviewOpen(v => !v)}
              >
                Preview {previewOpen ? '\u25B2' : '\u25BC'}
              </button>
            </div>

            {previewOpen && (
              <div className={styl.previewRow}>
                {PREVIEW_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={styl.previewBtn}
                    data-active={manualOverride === cat || undefined}
                    onClick={() => onSetManualOverride(manualOverride === cat ? null : cat)}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // --- Desktop layout ---
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
              data-active={(locationName !== 'Tokyo' && !isGeolocating) || undefined}
              disabled={isGeolocating}
              onClick={() => onSetLocation('geolocation')}
            >
              {isGeolocating ? 'Locating...' : 'My Location'}
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
