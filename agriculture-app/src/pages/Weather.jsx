import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Loader2, RefreshCw, MapPin, Wind, Droplets, Thermometer,
  Gauge, Sunrise, Sunset, AlertTriangle, Sun, CloudRain, Cloud
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCurrentWeather, getForecast, getWeatherAlerts } from '../api/weather';

function WeatherIcon({ condition, className = 'w-12 h-12' }) {
  const c = condition?.toLowerCase() || '';
  if (c === 'clear') return <Sun className={`${className} text-amber-400`} />;
  if (c === 'rain' || c === 'drizzle') return <CloudRain className={`${className} text-blue-400`} />;
  if (c === 'thunderstorm') return <CloudRain className={`${className} text-purple-400`} />;
  return <Cloud className={`${className} text-stone-400`} />;
}

function formatTime(unixTs) {
  return new Date(unixTs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Weather() {
  const { t, isRTL } = useApp();
  const [current, setCurrent] = useState(null);
  const [hourly, setHourly] = useState(null);
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('today'); // today | week
  const [alerts, setAlerts] = useState([]);
  const hasFetchedRef = useRef(false); // Prevent duplicate fetches

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError('');
    setAlerts([]);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude: lat, longitude: lon } = position.coords;

          // Fetch both current and forecast in parallel
          const [currentData, forecastData] = await Promise.all([
            getCurrentWeather(lat, lon),
            getForecast(lat, lon),
          ]);

          setCurrent(currentData);
          setAlerts(getWeatherAlerts(currentData));

          const hourlyList = forecastData.list.slice(0, 8);
          setHourly(hourlyList);

          const dailyList = forecastData.list.filter(item => item.dt_txt.includes('12:00:00'));
          setDaily(dailyList);
        } catch (err) {
          console.error('Weather fetch error:', err);
          setError(err.message || 'Failed to get weather data');
          toast.error('Weather API failed: ' + (err.message || 'Unknown error'));
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError('Please allow location access to check weather');
        setLoading(false);
      }
    );
  }, []); // No dependencies - stable function

  // Auto-fetch on mount - only once
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchWeather();
  }, [fetchWeather]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900">{t('weatherForecast')}</h1>
        <button
          onClick={fetchWeather}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all text-sm font-bold disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isRTL ? 'اپ ڈیٹ کریں' : 'Update Location'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{alert.icon} {alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading spinner */}
      {loading && !current && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Current Weather Card */}
      {current && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Location & Temp */}
                <div className="text-center lg:text-left flex-1">
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-blue-100 font-medium mb-2">
                    <MapPin className="w-5 h-5" />
                    <span className="text-lg">{current.name}, {current.sys?.country}</span>
                  </div>
                  <div className="text-8xl font-bold tracking-tighter mb-2">
                    {current.main?.temp?.toFixed(1)}°
                  </div>
                  <div className="text-2xl font-medium text-blue-100 capitalize">
                    {current.weather?.[0]?.description}
                  </div>
                  <div className="flex items-center justify-center lg:justify-start gap-4 mt-4 text-sm text-blue-200">
                    <span>H: {Math.round(current.main?.temp_max || 0)}°</span>
                    <span>L: {Math.round(current.main?.temp_min || 0)}°</span>
                  </div>
                </div>

                {/* Icon */}
                <div className="flex flex-col items-center flex-1">
                  <WeatherIcon condition={current.weather?.[0]?.main} className="w-32 h-32 lg:w-40 lg:h-40 drop-shadow-2xl" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 w-full lg:w-auto flex-1">
                  {[
                    { icon: <Wind className="w-5 h-5 text-blue-200" />, label: t('wind'), value: `${current.wind?.speed} m/s` },
                    { icon: <Droplets className="w-5 h-5 text-blue-200" />, label: t('humidity'), value: `${current.main?.humidity}%` },
                    { icon: <Thermometer className="w-5 h-5 text-blue-200" />, label: t('feelsLike'), value: `${Math.round(current.main?.feels_like || 0)}°` },
                    { icon: <Gauge className="w-5 h-5 text-blue-200" />, label: t('pressure'), value: `${current.main?.pressure} hPa` },
                    { icon: <Sunrise className="w-5 h-5 text-amber-300" />, label: 'Sunrise', value: formatTime(current.sys?.sunrise) },
                    { icon: <Sunset className="w-5 h-5 text-orange-300" />, label: 'Sunset', value: formatTime(current.sys?.sunset) },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-md p-3 rounded-2xl flex flex-col items-center justify-center min-w-[110px]">
                      {stat.icon}
                      <span className="text-xs text-blue-200 uppercase tracking-wider mt-1">{stat.label}</span>
                      <span className="font-bold text-sm">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-stone-100 inline-flex relative">
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-blue-600 rounded-xl transition-all duration-300 shadow-md ${
                view === 'today' ? (isRTL ? 'right-1.5' : 'left-1.5') : (isRTL ? 'right-[calc(50%+1.5px)]' : 'left-[calc(50%+1.5px)]')
              }`}
            />
            {['today', 'week'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`relative z-10 px-6 py-2 text-sm font-bold rounded-xl transition-colors duration-300 ${
                  view === v ? 'text-white' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {v === 'today' ? (isRTL ? 'آج' : 'Today') : (isRTL ? '7 دن' : '7 Days')}
              </button>
            ))}
          </div>

          {/* Forecast Panel */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 min-h-[200px]">
            <h3 className="text-lg font-bold text-stone-900 mb-6">
              {view === 'today'
                ? (isRTL ? 'گھنٹہ وار پیشن گوئی' : 'Hourly Forecast')
                : (isRTL ? '7 دن کی پیشن گوئی' : '7-Day Forecast')}
            </h3>

            {view === 'today' && hourly && (
              <div className="overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-4 min-w-max">
                  {hourly.map((item) => (
                    <div
                      key={item.dt}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all min-w-[100px]"
                    >
                      <span className="text-xs font-bold text-stone-400 mb-2">
                        {new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <WeatherIcon condition={item.weather?.[0]?.main} className="w-10 h-10 mb-3" />
                      <span className="text-xl font-bold text-stone-900">{Math.round(item.main?.temp)}°</span>
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium text-blue-500">
                        <Droplets className="w-3 h-3" />
                        {Math.round((item.pop || 0) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'week' && daily && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                {daily.map((item) => {
                  const date = new Date(item.dt * 1000);
                  return (
                    <div
                      key={item.dt}
                      className="flex flex-col items-center p-4 rounded-3xl bg-stone-50 border border-stone-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                    >
                      <div className="text-center mb-3">
                        <div className="font-bold text-stone-900">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <WeatherIcon condition={item.weather?.[0]?.main} className="w-12 h-12 mb-4" />
                      <div className="text-center space-y-1 w-full">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-lg font-bold text-stone-900">{Math.round(item.main?.temp_max || 0)}°</span>
                          <span className="text-stone-400 text-sm">/ {Math.round(item.main?.temp_min || 0)}°</span>
                        </div>
                        <div className="text-[10px] font-medium text-stone-500 capitalize truncate px-1">
                          {item.weather?.[0]?.description}
                        </div>
                        {item.pop > 0 && (
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-500 mt-1">
                            <Droplets className="w-3 h-3" />
                            {Math.round(item.pop * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !current && !error && (
        <div className="text-center py-16 text-stone-400">
          <Cloud className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-medium">{isRTL ? 'موسم لوڈ کیا جا رہا ہے...' : 'Loading weather data...'}</p>
        </div>
      )}
    </div>
  );
}
