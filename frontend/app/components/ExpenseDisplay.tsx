'use client';

import { useState, useEffect } from 'react';
import { apiService, DailyExpenseResponse, WeeklyExpenseResponse, MonthlyExpenseResponse } from '../lib/api';
import { Calendar, RefreshCw, BarChart3, PieChart, TrendingUp, Eye } from 'lucide-react';

type ViewMode = 'daily' | 'weekly' | 'monthly';

const categoryColors: { [key: string]: string } = {
  'Food': 'from-orange-400 to-red-500',
  'Transport': 'from-blue-400 to-cyan-500',
  'Entertainment': 'from-purple-400 to-pink-500',
  'Shopping': 'from-green-400 to-teal-500',
  'Bills': 'from-gray-400 to-slate-500',
  'Healthcare': 'from-emerald-400 to-green-500',
  'Other': 'from-indigo-400 to-purple-500'
};

const categoryIcons: { [key: string]: string } = {
  'Food': '🍕',
  'Transport': '🚗',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Bills': '📊',
  'Healthcare': '🏥',
  'Other': '📦'
};

export default function ExpenseDisplay() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState<DailyExpenseResponse | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyExpenseResponse | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyExpenseResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (viewMode) {
        case 'daily':
          const daily = await apiService.getDailyExpenses(date);
          setDailyData(daily);
          break;
        case 'weekly':
          const weekly = await apiService.getWeeklyExpenses(date);
          setWeeklyData(weekly);
          break;
        case 'monthly':
          const monthly = await apiService.getMonthlyExpenses(date);
          setMonthlyData(monthly);
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, date]);

  const refreshData = () => {
    fetchData();
  };

  const getTotalColor = (total: number) => {
    if (total === 0) return 'text-gray-500';
    if (total < 50) return 'text-green-600';
    if (total < 200) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderDailyView = () => {
    if (!dailyData) return null;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Daily Breakdown</h3>
          <span className={`text-3xl font-bold ${getTotalColor(dailyData.total)}`}>
            ${dailyData.total.toFixed(2)}
          </span>
        </div>
        
        {dailyData.expenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500 text-lg">No expenses for this date</p>
            <p className="text-gray-400 text-sm">Add your first expense to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyData.expenses.map((expense, index) => (
              <div key={index} className="glass-card rounded-2xl p-4 hover-lift">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-r ${categoryColors[expense.category] || 'from-gray-400 to-slate-500'}`}>
                      <span className="text-white text-sm">{categoryIcons[expense.category] || '📦'}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{expense.category}</div>
                      {expense.description && (
                        <div className="text-sm text-gray-600">{expense.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">${expense.amount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderWeeklyView = () => {
    if (!weeklyData) return null;

    const categories = Object.entries(weeklyData.totals_by_category);
    const maxAmount = Math.max(...categories.map(([_, amount]) => amount), 1);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Weekly Overview</h3>
          <span className={`text-3xl font-bold ${getTotalColor(weeklyData.total)}`}>
            ${weeklyData.total.toFixed(2)}
          </span>
        </div>
        
        <div className="space-y-4">
          {categories.map(([category, amount]) => (
            <div key={category} className="glass-card rounded-2xl p-4 hover-lift">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-r ${categoryColors[category] || 'from-gray-400 to-slate-500'}`}>
                    <span className="text-white text-sm">{categoryIcons[category] || '📦'}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{category}</span>
                </div>
                <span className="text-lg font-bold text-red-600">${amount.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full bg-gradient-to-r ${categoryColors[category] || 'from-gray-400 to-slate-500'}`}
                  style={{ width: `${(amount / maxAmount) * 100}%` }}
                />
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {((amount / weeklyData.total) * 100).toFixed(1)}% of total
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthlyView = () => {
    if (!monthlyData) return null;

    const categories = Object.entries(monthlyData.totals_by_category).sort((a, b) => b[1] - a[1]);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Monthly Analytics</h3>
          <span className={`text-3xl font-bold ${getTotalColor(monthlyData.total)}`}>
            ${monthlyData.total.toFixed(2)}
          </span>
        </div>
        
        <div className="grid gap-4">
          {categories.map(([category, amount]) => (
            <div key={category} className="glass-card rounded-2xl p-4 hover-lift">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-r ${categoryColors[category] || 'from-gray-400 to-slate-500'}`}>
                    <span className="text-white text-lg">{categoryIcons[category] || '📦'}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{category}</div>
                    <div className="text-sm text-gray-600">
                      {((amount / monthlyData.total) * 100).toFixed(1)}% of monthly spend
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-red-600">${amount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">This month</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const viewModeIcons = {
    daily: <Eye className="w-4 h-4" />,
    weekly: <BarChart3 className="w-4 h-4" />,
    monthly: <PieChart className="w-4 h-4" />
  };

  return (
    <div className="glass-card rounded-3xl p-8 hover-lift">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold gradient-text">Expense Analytics</h2>
            <p className="text-gray-600 text-sm">Insights at a glance</p>
          </div>
        </div>
        <button
          onClick={refreshData}
          disabled={loading}
          className="p-3 bg-white/50 border border-gray-200 rounded-2xl hover:bg-white/80 transition-all duration-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2 mb-6 p-2 bg-white/50 rounded-2xl">
        {(['daily', 'weekly', 'monthly'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold capitalize transition-all duration-300 flex-1 ${
              viewMode === mode
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/80'
            }`}
          >
            {viewModeIcons[mode]}
            {mode}
          </button>
        ))}
      </div>

      {/* Date Selector */}
      <div className="mb-8">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
          <Calendar className="w-4 h-4" />
          Select Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {/* Data Display */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-gray-500">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'daily' && renderDailyView()}
            {viewMode === 'weekly' && renderWeeklyView()}
            {viewMode === 'monthly' && renderMonthlyView()}
          </>
        )}
      </div>
    </div>
  );
}