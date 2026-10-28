'use client';

import { useState } from 'react';
import { apiService } from '../lib/api';
import { LogIn, UserPlus, User, Lock } from 'lucide-react';

interface AuthFormProps {
  onAuthenticated: (username: string) => void;
}

export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const auth = isLogin
        ? await apiService.login(username, password)
        : await apiService.register(username, password);
      onAuthenticated(auth.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(isLogin ? 'register' : 'login');
    setError('');
  };

  return (
    <div className="max-w-md mx-auto bg-white/80 backdrop-blur-lg border border-white/20 shadow-xl rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
          {isLogin ? <LogIn className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-gray-600 text-sm">
            {isLogin ? 'Log in to see your expenses' : 'Sign up to start tracking'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <User className="w-4 h-4" />
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            minLength={isLogin ? undefined : 3}
            maxLength={50}
            required
            className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="Your username"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Lock className="w-4 h-4" />
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? undefined : 6}
            maxLength={72}
            required
            className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
          />
        </div>

        {error && (
          <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {loading ? 'Please wait...' : isLogin ? 'Log in' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button type="button" onClick={switchMode} className="font-semibold text-blue-600 hover:underline">
          {isLogin ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  );
}