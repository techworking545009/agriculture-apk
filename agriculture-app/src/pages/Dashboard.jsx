import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, DollarSign, Leaf, Plus, RefreshCw, Cloud, Loader2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCurrentWeather, getWeatherAlerts } from '../api/weather';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// Small weather widget for dashboard
function WeatherWidget() {
  const { isRTL } = useApp();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasFetchedRef = useRef(false);

  const fetchWeather = useCallback(async () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const data = await getCurrentWeather(coords.latitude, coords.longitude);
          setWeather(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      () => setLoading(false)
    );
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    // Only auto-fetch if permission already granted
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') fetchWeather();
        else setLoading(false);
      });
    } else {
      fetchWeather();
    }
  }, [fetchWeather]);

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-white/10">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            {isRTL ? 'موسم' : 'Local Weather'}
          </h3>
          <button
            onClick={fetchWeather}
            disabled={loading}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {isRTL ? 'چیک' : 'Check'}
          </button>
        </div>

        {error ? (
          <p className="text-blue-100 text-sm">{error}</p>
        ) : weather ? (
          <div>
            <div className="text-4xl font-bold mb-1">{Math.round(weather.main?.temp)}°C</div>
            <div className="text-blue-100 capitalize">{weather.weather?.[0]?.description}</div>
            <div className="text-sm text-blue-200 flex items-center gap-1 mt-1">
              <RefreshCw className="w-3 h-3" /> {weather.name}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
              <div>
                <div className="text-xs text-blue-200">{isRTL ? 'نمی' : 'Humidity'}</div>
                <div className="font-semibold">{weather.main?.humidity}%</div>
              </div>
              <div>
                <div className="text-xs text-blue-200">{isRTL ? 'ہوا' : 'Wind'}</div>
                <div className="font-semibold">{weather.wind?.speed} m/s</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-blue-100 py-4">
            <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{isRTL ? 'موسم کا حال جاننے کے لیے کلک کریں' : 'Click to check weather'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ setActiveTab }) {
  const { t, isRTL, formatCurrency, settings } = useApp();
  const [stats, setStats] = useState({ totalCrops: 0, totalExpenses: 0, totalSales: 0, netProfit: 0 });
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('All');
  // Use ref to prevent multiple fetches caused by re-renders
  const fetchingRef = useRef(false);

  const getDateLimit = useCallback((range) => {
    if (range === 'All') return null;
    const now = new Date();
    const date = new Date();
    if (range === 'Week') date.setDate(now.getDate() - 7);
    else if (range === 'Month') date.setMonth(now.getMonth() - 1);
    else if (range === '3Month') date.setMonth(now.getMonth() - 3);
    else if (range === '6Month') date.setMonth(now.getMonth() - 6);
    else if (range === '1Year') date.setFullYear(now.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  }, []);

  const fetchData = useCallback(async () => {
    if (!auth.currentUser || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      const uid = auth.currentUser.uid;
      const dateLimit = getDateLimit(timeRange);

      // Fetch all data in parallel with single queries
      const [cropsSnap, expensesSnap, salesSnap] = await Promise.all([
        getDocs(query(collection(db, 'crops'), where('userId', '==', uid))),
        getDocs(query(collection(db, 'expenses'), where('userId', '==', uid))),
        getDocs(query(collection(db, 'sales'), where('userId', '==', uid))),
      ]);

      const crops = cropsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const expenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter by date if needed
      const filterByDate = (items, dateField) =>
        dateLimit ? items.filter(item => (item[dateField] || '') >= dateLimit) : items;

      const filteredCrops = filterByDate(crops, 'plantedDate');
      const filteredExpenses = filterByDate(expenses, 'date');
      const filteredSales = filterByDate(sales, 'date');

      const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalSales = filteredSales.reduce((sum, s) => sum + (s.status === 'sold' ? (s.totalAmount || 0) : 0), 0);

      setStats({
        totalCrops: filteredCrops.length,
        totalExpenses,
        totalSales,
        netProfit: totalSales - totalExpenses,
      });

      // Expense breakdown by category
      const catMap = new Map();
      filteredExpenses.forEach(e => {
        const cat = e.category || 'Other';
        catMap.set(cat, (catMap.get(cat) || 0) + (e.amount || 0));
      });
      const cats = Array.from(catMap.entries())
        .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))
        .sort((a, b) => b.value - a.value);
      setExpenseCategories(cats);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [timeRange, getDateLimit]); // timeRange is the only real dependency

  // Fetch when timeRange changes or auth user available
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statCards = [
    { label: t('crops').toUpperCase(), value: stats.totalCrops, sub: 'Active Projects', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: t('totalExpenses').toUpperCase(), value: settings.privacyMode ? '••••••' : formatCurrency(stats.totalExpenses), sub: t('totalExpenses'), color: 'text-red-700', bg: 'bg-red-50' },
    { label: t('totalRevenue').toUpperCase(), value: settings.privacyMode ? '••••••' : formatCurrency(stats.totalSales), sub: t('totalRevenue'), color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: t('netProfit').toUpperCase(), value: settings.privacyMode ? '••••••' : formatCurrency(stats.netProfit), sub: t('netProfit'), color: stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700', bg: stats.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-stone-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-stone-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Quick Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('expenses')}
          disabled={settings.readOnlyMode}
          className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> {t('addExpense')}
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          disabled={settings.readOnlyMode}
          className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> {t('addSale')}
        </button>
      </div>

      {/* Weather Widget */}
      <WeatherWidget />

      {/* Time Range Filter */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
          {isRTL ? 'وقت کی حد' : 'Time Range'}
        </p>
        <div className="flex flex-wrap gap-2">
          {['All', 'Week', 'Month', '3Month', '6Month', '1Year'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                timeRange === range
                  ? 'bg-stone-900 text-white shadow-lg'
                  : 'bg-white text-stone-500 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              {range === 'All' ? (isRTL ? 'سب' : 'All')
                : range === 'Week' ? (isRTL ? '1 ہفتہ' : '1W')
                : range === 'Month' ? (isRTL ? '1 مہینہ' : '1M')
                : range === '3Month' ? (isRTL ? '3 مہینے' : '3M')
                : range === '6Month' ? (isRTL ? '6 مہینے' : '6M')
                : (isRTL ? '1 سال' : '1Y')}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`${card.bg} p-5 rounded-2xl border border-stone-100`}>
            <h3 className={`text-[10px] font-extrabold uppercase tracking-widest ${card.color} mb-2`}>
              {card.label}
            </h3>
            <p className={`text-xl font-bold ${card.color} truncate`}>{card.value}</p>
            <p className="text-[10px] text-stone-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Profit Goal */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h3 className="text-lg font-bold text-stone-900">
              {isRTL ? 'ہدف منافع' : 'Target Profit Goal'}
            </h3>
            <p className="text-sm text-stone-500 mt-1">
              {settings.privacyMode ? '••••••' : formatCurrency(stats.netProfit)} / {formatCurrency(settings.targetProfitGoal || 100000)}
            </p>
          </div>
          <span className="text-3xl font-bold text-emerald-600">
            {Math.min(100, Math.max(0, Math.round(stats.netProfit / (settings.targetProfitGoal || 100000) * 100)))}%
          </span>
        </div>
        <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, Math.max(0, stats.netProfit / (settings.targetProfitGoal || 100000) * 100))}%` }}
          />
        </div>
      </div>

      {/* Expense Breakdown Chart */}
      {expenseCategories.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <h3 className="text-lg font-bold text-stone-900 mb-6">
            {isRTL ? 'اخراجات کی تفصیل' : 'Expenses Breakdown'}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseCategories}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => settings.privacyMode ? '••••••' : formatCurrency(val)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Net Profit Summary */}
      <div className={`rounded-3xl p-6 shadow-sm border ${stats.netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
        <div className="flex items-center gap-3">
          {stats.netProfit >= 0
            ? <TrendingUp className="w-8 h-8 text-emerald-600" />
            : <TrendingDown className="w-8 h-8 text-red-600" />}
          <div>
            <p className="text-sm font-bold text-stone-600">{t('netProfit')}</p>
            <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {settings.privacyMode ? '••••••' : formatCurrency(stats.netProfit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
