const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ---------- Types ----------

// What the form sends when adding an expense
export interface Expense {
  category: string;
  amount: number;
  description?: string;
  date?: string;
}

// What the backend returns for a stored expense
export interface StoredExpense extends Expense {
  id: number;
  date: string;
  created_at: string; // ISO timestamp of when the expense was recorded
}

export interface DateRequest {
  target_date?: string;
}

export interface DailyExpenseResponse {
  date: string;
  total: number;
  expenses: StoredExpense[];
}

export interface WeeklyExpenseResponse {
  week_start: string;
  week_end: string;
  total: number;
  totals_by_category: { [category: string]: number };
}

export interface MonthlyExpenseResponse {
  month: string;
  total: number;
  totals_by_category: { [category: string]: number };
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  username: string;
}

// ---------- Auth token storage ----------

const TOKEN_KEY = 'expensify_token';
const USERNAME_KEY = 'expensify_username';
export const UNAUTHORIZED_EVENT = 'expensify:unauthorized';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(USERNAME_KEY);
}

function saveAuth(auth: AuthResponse) {
  window.localStorage.setItem(TOKEN_KEY, auth.access_token);
  window.localStorage.setItem(USERNAME_KEY, auth.username);
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USERNAME_KEY);
}

// ---------- Errors ----------

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---------- API client ----------

class ApiService {
  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      // A 401 while holding a token means it expired or is invalid: log the user out
      if (response.status === 401 && token) {
        clearAuth();
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }

      let message = response.statusText || 'Request failed';
      try {
        const body = await response.json();
        if (typeof body.detail === 'string') {
          message = body.detail;
        } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
          message = body.detail[0].msg; // validation error from FastAPI
        }
      } catch {
        // response had no JSON body; keep the default message
      }
      throw new ApiError(message, response.status);
    }

    return response.json();
  }

  // ----- Auth -----
  async register(username: string, password: string): Promise<AuthResponse> {
    const auth: AuthResponse = await this.fetchApi('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    saveAuth(auth);
    return auth;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const auth: AuthResponse = await this.fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    saveAuth(auth);
    return auth;
  }

  async getMe(): Promise<{ id: number; username: string }> {
    return this.fetchApi('/me');
  }

  logout() {
    clearAuth();
  }

  // ----- Expenses -----

  // Add new expense
  async addExpense(expense: Expense) {
    return this.fetchApi('/add-expense', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  // Get daily expenses
  async getDailyExpenses(date?: string): Promise<DailyExpenseResponse> {
    return this.fetchApi('/daily-expenses', {
      method: 'POST',
      body: JSON.stringify({ target_date: date }),
    });
  }

  // Get weekly expenses
  async getWeeklyExpenses(date?: string): Promise<WeeklyExpenseResponse> {
    return this.fetchApi('/weekly-expenses', {
      method: 'POST',
      body: JSON.stringify({ target_date: date }),
    });
  }

  // Get monthly expenses
  async getMonthlyExpenses(date?: string): Promise<MonthlyExpenseResponse> {
    return this.fetchApi('/monthly-expenses', {
      method: 'POST',
      body: JSON.stringify({ target_date: date }),
    });
  }

  // Update an existing expense
  async updateExpense(id: number, expense: Expense) {
    return this.fetchApi(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expense),
    });
  }

  // Delete an expense
  async deleteExpense(id: number) {
    return this.fetchApi(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();