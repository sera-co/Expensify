'use client';

import { useState } from 'react';
import AddExpenseForm from './components/AddExpenseForm';
import ExpenseDisplay from './components/ExpenseDisplay';

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleExpenseAdded = () => {
    // Trigger refresh of expense display
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            💰 Expensify
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track your expenses, manage your budget, and gain insights into your spending habits
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Add Expense Form */}
          <div>
            <AddExpenseForm onExpenseAdded={handleExpenseAdded} />
          </div>

          {/* Right Column - Expense Display */}
          <div>
            <ExpenseDisplay key={refreshTrigger} />
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-12 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">📊</div>
              <h3 className="font-semibold text-gray-800 mb-2">Daily Tracking</h3>
              <p className="text-gray-600 text-sm">Monitor your daily expenses in real-time</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">📈</div>
              <h3 className="font-semibold text-gray-800 mb-2">Weekly Insights</h3>
              <p className="text-gray-600 text-sm">Get weekly breakdowns by category</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">🎯</div>
              <h3 className="font-semibold text-gray-800 mb-2">Monthly Overview</h3>
              <p className="text-gray-600 text-sm">Understand your monthly spending patterns</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>Built with FastAPI + Next.js • Smart Expense Tracking</p>
        </footer>
      </div>
    </main>
  );
}