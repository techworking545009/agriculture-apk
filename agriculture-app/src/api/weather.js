/**
 * Weather API with automatic fallback across 3 API keys.
 * If one key fails (rate limit, invalid, etc.), it tries the next.
 */

const WEATHER_API_KEYS = [
  'd0b9c2e03b1929c996bb3c84506fc0e3',
  '6726d0bdae50d3dd7372284e1f9b4d7b',
  '0073793a132e037b108dabb37211eef4',
];

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

async function fetchWithFallback(buildUrl) {
  let lastError = null;
  for (let i = 0; i < WEATHER_API_KEYS.length; i++) {
    const key = WEATHER_API_KEYS[i];
    try {
      const url = buildUrl(key);
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      const errText = await response.text();
      // If it's a rate limit or invalid key, try next key
      if (response.status === 401 || response.status === 429) {
        console.warn(`Weather API key ${i + 1} failed (${response.status}), trying next...`);
        lastError = new Error(`API key ${i + 1} failed: ${response.status}`);
        continue;
      }
      throw new Error(`Weather API Error ${response.status}: ${errText}`);
    } catch (err) {
      if (err.message.includes('API key')) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('All weather API keys failed');
}

export async function getCurrentWeather(lat, lon) {
  return fetchWithFallback(
    (key) => `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric`
  );
}

export async function getForecast(lat, lon) {
  return fetchWithFallback(
    (key) => `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric`
  );
}

export function getWeatherAlerts(weatherData) {
  const alerts = [];
  if (!weatherData) return alerts;

  const temp = weatherData.main?.temp;
  const humidity = weatherData.main?.humidity;
  const windSpeed = weatherData.wind?.speed;
  const weatherId = weatherData.weather?.[0]?.id;

  if (temp !== undefined) {
    if (temp <= 2) {
      alerts.push({ type: 'error', icon: '❄️', message: 'Frost Warning: Temperature is critically low!' });
    } else if (temp > 38) {
      alerts.push({ type: 'warning', icon: '🌡️', message: 'Extreme Heat Alert: Protect your crops from heat stress.' });
    }
  }

  if (weatherId !== undefined) {
    if (weatherId >= 502 && weatherId <= 504) {
      alerts.push({ type: 'error', icon: '🌧️', message: 'Heavy Rain Alert: Potential flooding risk.' });
    } else if (weatherId >= 200 && weatherId <= 232) {
      alerts.push({ type: 'error', icon: '⛈️', message: 'Thunderstorm Warning: Secure equipment and livestock.' });
    }
  }

  if (windSpeed !== undefined && windSpeed > 10) {
    alerts.push({ type: 'warning', icon: '💨', message: 'High Winds Alert: Protect sensitive crops and structures.' });
  }

  if (humidity !== undefined && humidity > 90) {
    alerts.push({ type: 'warning', icon: '💧', message: 'High Humidity: Increased fungal disease risk.' });
  }

  return alerts;
}
