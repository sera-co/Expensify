const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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

class ApiService {
  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

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
}

export const apiService = new ApiService();