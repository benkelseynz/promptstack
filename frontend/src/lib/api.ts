import Cookies from 'js-cookie';
import type {
  User,
  Prompt,
  CustomPrompt,
  Industry,
  PricingConfig,
  FilterOptions,
  SearchQuery,
  PaginatedResponse,
  UserProfile,
  ProfileStatus,
  ProfileRole,
  ProfileCommunication,
  ProfileWritingStyle,
  ProfileWorkingStyle,
  ProfileFormatting,
  ProfilePersonal,
  Question,
  QuestionCategory,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = Cookies.get('token') || null;
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      Cookies.set('token', token, { expires: 7, sameSite: 'lax' });
    } else {
      Cookies.remove('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'An error occurred');
    }

    return data;
  }

  // Auth endpoints
  async signup(email: string, password: string, name: string) {
    const data = await this.request<{ user: User; token: string; message: string }>(
      '/api/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }
    );
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ user: User; token: string; message: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    this.setToken(data.token);
    return data;
  }

  async logout() {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getMe() {
    return this.request<{ user: User; profileStatus: ProfileStatus }>('/api/auth/me');
  }

  async verifyEmail(token: string) {
    return this.request<{ user: User; message: string }>(
      `/api/auth/verify?token=${token}`
    );
  }

  async resendVerification(email: string) {
    return this.request<{ message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Library endpoints
  async getIndustries() {
    return this.request<{ industries: Industry[]; total: number }>(
      '/api/library/industries'
    );
  }

  async getFilters() {
    return this.request<FilterOptions>('/api/library/filters');
  }

  async searchPrompts(query: SearchQuery = {}) {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.industry) params.set('industry', query.industry);
    if (query.category) params.set('category', query.category);
    if (query.role) params.set('role', query.role);
    if (query.access) params.set('access', query.access);
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());

    return this.request<PaginatedResponse<Prompt>>(
      `/api/library/prompts?${params.toString()}`
    );
  }

  async getPrompt(id: string) {
    return this.request<{ prompt: Prompt }>(`/api/library/prompts/${id}`);
  }

  // User endpoints
  async getUserPrompts() {
    return this.request<{ prompts: CustomPrompt[]; total: number }>(
      '/api/user/prompts'
    );
  }

  async createUserPrompt(data: { title: string; content: string; keywords?: string[]; industry?: string; role?: string }) {
    return this.request<{ prompt: CustomPrompt; message: string }>(
      '/api/user/prompts',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateUserPrompt(
    id: string,
    data: { title?: string; content?: string; keywords?: string[]; industry?: string; role?: string }
  ) {
    return this.request<{ prompt: CustomPrompt; message: string }>(
      `/api/user/prompts/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteUserPrompt(id: string) {
    return this.request<{ message: string }>(`/api/user/prompts/${id}`, {
      method: 'DELETE',
    });
  }

  async getSavedPrompts() {
    return this.request<{ prompts: Prompt[]; total: number }>('/api/user/saved');
  }

  async savePrompt(id: string) {
    return this.request<{ message: string; savedCount: number }>(
      `/api/user/saved/${id}`,
      { method: 'POST' }
    );
  }

  async removeSavedPrompt(id: string) {
    return this.request<{ message: string; savedCount: number }>(
      `/api/user/saved/${id}`,
      { method: 'DELETE' }
    );
  }

  // Profile endpoints
  async getProfile() {
    return this.request<{ profile: UserProfile }>('/api/user/profile');
  }

  async getProfileStatus() {
    return this.request<ProfileStatus>('/api/user/profile/status');
  }

  async updateProfileSection(
    section: 'role',
    data: Partial<ProfileRole>
  ): Promise<{ message: string; profile: UserProfile }>;
  async updateProfileSection(
    section: 'communication',
    data: Partial<ProfileCommunication>
  ): Promise<{ message: string; profile: UserProfile }>;
  async updateProfileSection(
    section: 'writingStyle',
    data: Partial<ProfileWritingStyle>
  ): Promise<{ message: string; profile: UserProfile }>;
  async updateProfileSection(
    section: 'workingStyle',
    data: Partial<ProfileWorkingStyle>
  ): Promise<{ message: string; profile: UserProfile }>;
  async updateProfileSection(
    section: 'formatting',
    data: Partial<ProfileFormatting>
  ): Promise<{ message: string; profile: UserProfile }>;
  async updateProfileSection(
    section: 'personal',
    data: Partial<ProfilePersonal>
  ): Promise<{ message: string; profile: UserProfile }>;
  async updateProfileSection(
    section: string,
    data: Record<string, unknown>
  ): Promise<{ message: string; profile: UserProfile }> {
    return this.request<{ message: string; profile: UserProfile }>(
      `/api/user/profile/${section}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  // Config endpoints
  async getPricing() {
    return this.request<PricingConfig>('/api/config/pricing');
  }

  // Questions endpoints
  async getQuestions(params?: { category?: string; q?: string; access?: 'free' | 'premium' | 'all' }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.access) searchParams.set('access', params.access);

    const queryString = searchParams.toString();
    return this.request<{ categories: QuestionCategory[]; questions: Question[]; total: number }>(
      `/api/questions${queryString ? `?${queryString}` : ''}`
    );
  }

  async getQuestion(id: string) {
    return this.request<{ question: Question }>(`/api/questions/${id}`);
  }
}

export const api = new ApiClient();
