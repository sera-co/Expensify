'use client';

import { useState } from 'react';
import { apiService, Expense } from '../lib/api';
import { PlusCircle, DollarSign, Tag, FileText } from 'lucide-react';

interface AddExpenseFormProps {
  onExpenseAdded: () => void;
}

const categories = [
  { value: 'Food', icon: '🍕', color: 'from-orange-400 to-red-500' },
  { value: 'Transport', icon: '🚗', color: 'from-blue-400 to-cyan-500' },
  { value: 'Entertainment', icon: '🎬', color: 'from-purple-400 to-pink-500' },
  { value: 'Shopping', icon: '🛍️', color: 'from-green-400 to-teal-500' },
  { value: 'Bills', icon: '📊', color: 'from-gray-400 to-slate-500' },
  { value: 'Healthcare', icon: '🏥', color: 'from-emerald-400 to-green-500' },
  { value: 'Other', icon: '📦', color: 'from-indigo-400 to-purple-500' }
];

export default function AddExpenseForm({ onExpenseAdded }: AddExpenseFormProps) {
  const [formData, setFormData] = useState<Omit<Expense, 'date'>>({
    category: 'Food',
    amount: 0,
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Food');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiService.addExpense(formData);
      setFormData({ category: 'Food', amount: 0, description: '' });
      setSelectedCategory('Food');
      onExpenseAdded();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, category }));
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg border border-white/20 shadow-xl rounded-3xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
          <PlusCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Add Expense
          </h2>
          <p className="text-gray-600 text-sm">Track your spending effortlessly</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
            <Tag className="w-4 h-4" />
            Category
          </label>
          <div className="grid grid-cols-4 gap-3">
            {categories.map(({ value, icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleCategorySelect(value)}
                className={`p-3 rounded-2xl text-center transition-all duration-300 ${
                  selectedCategory === value
                    ? `bg-gradient-to-r ${color} text-white shadow-lg scale-105`
                    : 'bg-white/50 text-gray-600 hover:bg-white/80 hover:scale-105'
                }`}
              >
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-xs font-medium">{value}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <DollarSign className="w-4 h-4" />
            Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-500 text-lg">$</span>
            </div>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full pl-10 pr-4 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-semibold"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <FileText className="w-4 h-4" />
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            placeholder="What was this expense for? (Optional)"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adding Expense...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <PlusCircle className="w-5 h-5" />
              Add Expense
            </div>
          )}
        </button>
      </form>
    </div>
  );
}