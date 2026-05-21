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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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

  async uploadExam(file: File, isPublic = false) {
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

  async uploadExamPDF(file: File, isPublic = false, pdfFormat = 'ccna') {
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
    return this.request('/api/sessions/start', {
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
    return this.request(`/api/sessions/${query}`);
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
