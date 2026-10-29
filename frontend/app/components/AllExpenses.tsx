'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  apiService,
  ExpenseFilters,
  PaginatedExpensesResponse,
  StoredExpense,
} from '../lib/api';
import { Check, ChevronLeft, ChevronRight, List, Pencil, RefreshCw, Trash2, X } from 'lucide-react';

interface AllExpensesProps {
  refreshTrigger: number;
}

const categories = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Other'];
const inputClassName = 'w-full px-3 py-2 bg-white/70 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export default function AllExpenses({ refreshTrigger }: AllExpensesProps) {
  const [filters, setFilters] = useState<ExpenseFilters>({
    sort_by: 'date',
    sort_order: 'desc',
    page: 1,
    page_size: 10,
  });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [data, setData] = useState<PaginatedExpensesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setFilters((current) => current.page === 1 ? current : { ...current, page: 1 });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    const loadExpenses = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await apiService.getExpenses({
          ...filters,
          search: debouncedSearch || undefined,
        });
        if (active) setData(result);
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) return;
        console.error('Error fetching expenses:', requestError);
        setError('Failed to load expenses. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadExpenses();
    return () => {
      active = false;
    };
  }, [filters, debouncedSearch, refreshTrigger, reloadToken]);

  const updateFilter = (updates: Partial<ExpenseFilters>) => {
    setFilters((current) => ({ ...current, ...updates, page: 1 }));
  };

  const startEdit = (expense: StoredExpense) => {
    setEditingId(expense.id);
    setEditCategory(expense.category);
    setEditAmount(String(expense.amount));
    setEditDescription(expense.description || '');
    setError('');
  };

  const saveEdit = async (expense: StoredExpense) => {
    const amount = Number.parseFloat(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Please enter an amount greater than 0.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await apiService.updateExpense(expense.id, {
        category: editCategory,
        amount,
        description: editDescription.trim() || undefined,
        date: expense.date,
      });
      setEditingId(null);
      setReloadToken((current) => current + 1);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return;
      console.error('Error updating expense:', requestError);
      setError('Failed to update expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (expense: StoredExpense) => {
    if (!window.confirm(`Delete this ${expense.category} expense of ₹${expense.amount.toFixed(2)}?`)) return;
    setError('');
    try {
      await apiService.deleteExpense(expense.id);
      if (data?.items.length === 1 && (filters.page || 1) > 1) {
        setFilters((current) => ({ ...current, page: (current.page || 1) - 1 }));
      } else {
        setReloadToken((current) => current + 1);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return;
      console.error('Error deleting expense:', requestError);
      setError('Failed to delete expense. Please try again.');
    }
  };

  const currentPage = data?.page || filters.page || 1;
  const totalPages = Math.max(1, data?.total_pages || 0);

  return (
    <section className="glass-card rounded-3xl p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
            <List className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold gradient-text">All Expenses</h2>
            <p className="text-gray-600 text-sm">Search, filter, and manage your expenses</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setReloadToken((current) => current + 1)}
          disabled={loading}
          aria-label="Refresh expenses"
          className="p-3 bg-white/50 border border-gray-200 rounded-2xl hover:bg-white/80 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <label className="text-sm font-semibold text-gray-700">
          Category
          <select
            value={filters.category || ''}
            onChange={(event) => updateFilter({ category: event.target.value || undefined })}
            className={`${inputClassName} mt-2 font-normal`}
          >
            <option value="">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700">
          From date
          <input
            type="date"
            value={filters.from_date || ''}
            onChange={(event) => updateFilter({ from_date: event.target.value || undefined })}
            className={`${inputClassName} mt-2 font-normal`}
          />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          To date
          <input
            type="date"
            value={filters.to_date || ''}
            onChange={(event) => updateFilter({ to_date: event.target.value || undefined })}
            className={`${inputClassName} mt-2 font-normal`}
          />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Minimum amount
          <input
            type="number"
            min="0"
            step="0.01"
            value={filters.min_amount ?? ''}
            onChange={(event) => updateFilter({ min_amount: event.target.value ? Number(event.target.value) : undefined })}
            className={`${inputClassName} mt-2 font-normal`}
            placeholder="₹0.00"
          />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Maximum amount
          <input
            type="number"
            min="0"
            step="0.01"
            value={filters.max_amount ?? ''}
            onChange={(event) => updateFilter({ max_amount: event.target.value ? Number(event.target.value) : undefined })}
            className={`${inputClassName} mt-2 font-normal`}
            placeholder="No limit"
          />
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Sort by
          <select
            value={`${filters.sort_by}-${filters.sort_order}`}
            onChange={(event) => {
              const [sort_by, sort_order] = event.target.value.split('-') as [
                NonNullable<ExpenseFilters['sort_by']>,
                NonNullable<ExpenseFilters['sort_order']>,
              ];
              updateFilter({ sort_by, sort_order });
            }}
            className={`${inputClassName} mt-2 font-normal`}
          >
            <option value="date-desc">Date: newest first</option>
            <option value="date-asc">Date: oldest first</option>
            <option value="amount-desc">Amount: highest first</option>
            <option value="amount-asc">Amount: lowest first</option>
            <option value="category-asc">Category: A to Z</option>
            <option value="category-desc">Category: Z to A</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700 sm:col-span-2 lg:col-span-3">
          Search description
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className={`${inputClassName} mt-2 font-normal`}
            placeholder="Search expenses..."
          />
        </label>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="min-h-40">
        {loading && !data ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-12 text-center text-gray-500">No expenses match your filters.</p>
        ) : (
          <div className="space-y-3">
            {data.items.map((expense) => (
              <article key={expense.id} className="rounded-2xl border border-white/50 bg-white/60 p-4">
                {editingId === expense.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select value={editCategory} onChange={(event) => setEditCategory(event.target.value)} className={inputClassName}>
                        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                      </select>
                      <input type="number" min="0.01" step="0.01" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} className={inputClassName} aria-label="Expense amount" />
                    </div>
                    <input type="text" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className={inputClassName} aria-label="Expense description" placeholder="Description (optional)" />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditingId(null)} disabled={saving} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 rounded-xl hover:bg-white disabled:opacity-50">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                      <button type="button" onClick={() => void saveEdit(expense)} disabled={saving} className="flex items-center gap-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                        <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-800">{expense.category}</div>
                      <p className="text-sm text-gray-600">{expense.description || 'No description'}</p>
                      <time className="text-xs text-gray-500" dateTime={expense.date}>{expense.date}</time>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-lg font-bold text-red-600">₹{expense.amount.toFixed(2)}</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => startEdit(expense)} aria-label="Edit expense" className="p-2 text-gray-500 hover:text-blue-600 rounded-xl">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => void deleteExpense(expense)} aria-label="Delete expense" className="p-2 text-gray-500 hover:text-red-600 rounded-xl">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
        <p className="text-sm text-gray-600">
          {data ? `${data.total} expense${data.total === 1 ? '' : 's'} found` : ''}
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">
            Per page
            <select
              value={filters.page_size || 10}
              onChange={(event) => updateFilter({ page_size: Number(event.target.value) })}
              className="ml-2 px-2 py-1 bg-white/70 border border-gray-200 rounded-lg"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, (current.page || 1) - 1) }))}
            disabled={currentPage <= 1 || loading}
            aria-label="Previous page"
            className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, page: (current.page || 1) + 1 }))}
            disabled={currentPage >= totalPages || loading}
            aria-label="Next page"
            className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
