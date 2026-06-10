/**
 * API Client for VirtualExamp Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  // Shared in-flight refresh so concurrent 401s only trigger one refresh call.
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
    }
  }

  setToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('access_token', token);
      } else {
        localStorage.removeItem('access_token');
      }
    }
  }

  /**
   * Exchange the stored refresh token for a fresh access (+ refresh) token.
   * Returns true on success. Concurrent callers share a single request.
   * On failure the tokens are cleared so the caller's retry surfaces the 401.
   */
  private refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      if (typeof window === 'undefined') return false;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      try {
        // Backend declares `refresh_token: str`, so FastAPI expects it as a query param.
        const response = await fetch(
          `${this.baseUrl}/api/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`,
          { method: 'POST' }
        );

        if (!response.ok) {
          // Refresh token is expired/invalid — drop both so the user re-authenticates.
          this.setToken(null);
          localStorage.removeItem('refresh_token');
          return false;
        }

        const data = await response.json();
        this.setToken(data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        return true;
      } catch {
        return false;
      }
    })();

    // Clear the shared promise once it settles so later calls can refresh again.
    this.refreshPromise.finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      // Access token likely expired mid-session: refresh once and replay the request.
      if (
        response.status === 401 &&
        !isRetry &&
        !endpoint.startsWith('/api/auth/')
      ) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, true);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}` };
      }

      if (response.status === 204) {
        return { data: undefined as T };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Auth endpoints
  async register(email: string, password: string, displayName?: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ access_token: string; refresh_token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Exam endpoints
  async listExams(publicOnly = false) {
    return this.request(`/api/exams/?public_only=${publicOnly}`);
  }

  async getExam(examId: string) {
    return this.request(`/api/exams/${examId}`);
  }

  async uploadExam(file: File, isPublic = false, isRetry = false): Promise<ApiResponse<unknown>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_public', String(isPublic));

    const headers: HeadersInit = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/exams/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401 && !isRetry) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.uploadExam(file, isPublic, true);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}` };
      }

      return { data: await response.json() };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getFormats() {
    return this.request<{ file_formats: string[]; pdf_formats: string[] }>('/api/exams/formats');
  }

  async uploadExamPDF(file: File, isPublic = false, pdfFormat = 'ccna', isRetry = false): Promise<ApiResponse<unknown>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_public', String(isPublic));
    formData.append('pdf_format', pdfFormat);

    const headers: HeadersInit = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/exams/upload-pdf`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401 && !isRetry) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.uploadExamPDF(file, isPublic, pdfFormat, true);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { error: errorData.detail || `HTTP ${response.status}` };
      }

      return { data: await response.json() };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async deleteExam(examId: string) {
    return this.request(`/api/exams/${examId}`, { method: 'DELETE' });
  }

  // Session endpoints
  async startSession(examId: string, mode: 'timed' | 'training' | 'review', timeLimitMinutes?: number) {
    return this.request<{ id: string; exam_id: string; mode: string }>('/api/sessions/start', {
      method: 'POST',
      body: JSON.stringify({
        exam_id: examId,
        mode,
        time_limit_minutes: timeLimitMinutes,
      }),
    });
  }

  async getSession(sessionId: string) {
    return this.request(`/api/sessions/${sessionId}`);
  }

  async submitSession(sessionId: string, answers: Array<{
    question_id: string;
    answer: string[];
    time_spent_seconds: number;
    flagged: boolean;
  }>) {
    return this.request(`/api/sessions/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  // Preferences endpoints
  async getPreferences() {
    return this.request<{ theme: string; season: string | null }>('/api/users/me/preferences');
  }

  async updatePreferences(preferences: { theme?: string; season?: string | null }) {
    return this.request<{ theme: string; season: string | null }>('/api/users/me/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async listSessions(examId?: string) {
    const query = examId ? `?exam_id=${examId}` : '';
    return this.request<SessionListItem[]>(`/api/sessions/${query}`);
  }

  async getAnalyticsSummary() {
    return this.request<AnalyticsSummary>('/api/sessions/analytics/summary');
  }
}

export interface SessionListItem {
  id: string;
  exam_id: string;
  exam_title: string;
  mode: string;
  start_time: string;
  end_time: string | null;
  score: number | null;
  passed: boolean | null;
  total_questions: number | null;
  correct_answers: number | null;
  domain_scores: Record<string, number> | null;
  time_taken_seconds: number | null;
}

export interface AnalyticsSummary {
  total_exams: number;
  pass_rate: number;
  average_score: number;
  total_time_hours: number;
  weak_domains: Array<{
    domain_id: string;
    domain_name: string;
    avg_score: number;
  }>;
}

export const api = new ApiClient(API_BASE_URL);
export default api;
