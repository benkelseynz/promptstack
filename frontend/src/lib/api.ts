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
  CustomQuestion,
  Skill,
  CustomSkill,
  TeamSkill,
  Team,
  TeamSummary,
  TeamRole,
  TeamCategory,
  TeamPrompt,
  TeamQuestion,
  TeamWorkflow,
  WorkflowStep,
  TeamActivity,
  TeamAnalytics,
  ActivityType,
  PersonalWorkflow,
  WorkflowCategory,
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
  async signup(email: string, password: string, firstName: string, lastName: string) {
    const data = await this.request<{ user: User; token: string; message: string }>(
      '/api/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, firstName, lastName }),
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

  async createUserPrompt(data: {
    title: string;
    content: string;
    keywords?: string[];
    industry?: string;
    role?: string;
    categoryId?: string | null;
  }) {
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
    data: {
      title?: string;
      content?: string;
      keywords?: string[];
      industry?: string;
      role?: string;
      categoryId?: string | null;
    }
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

  async updateSavedPromptCategory(id: string, categoryId: string | null) {
    return this.request<{ message: string; categoryId: string | null }>(
      `/api/user/saved/${id}/category`,
      {
        method: 'PATCH',
        body: JSON.stringify({ categoryId }),
      }
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

  // Saved Questions endpoints
  async getSavedQuestions() {
    return this.request<{ questions: Question[]; total: number }>('/api/user/saved-questions');
  }

  async saveQuestion(id: string) {
    return this.request<{ message: string; savedCount: number }>(
      `/api/user/saved-questions/${id}`,
      { method: 'POST' }
    );
  }

  async removeSavedQuestion(id: string) {
    return this.request<{ message: string; savedCount: number }>(
      `/api/user/saved-questions/${id}`,
      { method: 'DELETE' }
    );
  }

  async updateSavedQuestionCategory(id: string, categoryId: string | null) {
    return this.request<{ message: string; categoryId: string | null }>(
      `/api/user/saved-questions/${id}/category`,
      {
        method: 'PATCH',
        body: JSON.stringify({ categoryId }),
      }
    );
  }

  // Custom Questions endpoints
  async getUserQuestions() {
    return this.request<{ questions: CustomQuestion[]; total: number }>(
      '/api/user/questions'
    );
  }

  async createUserQuestion(data: {
    question: string;
    context?: string;
    category?: string;
    tags?: string[];
    categoryId?: string | null;
  }) {
    return this.request<{ question: CustomQuestion; message: string }>(
      '/api/user/questions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateUserQuestion(
    id: string,
    data: {
      question?: string;
      context?: string;
      category?: string;
      tags?: string[];
      categoryId?: string | null;
    }
  ) {
    return this.request<{ question: CustomQuestion; message: string }>(
      `/api/user/questions/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteUserQuestion(id: string) {
    return this.request<{ message: string }>(`/api/user/questions/${id}`, {
      method: 'DELETE',
    });
  }

  // Skills library endpoints
  async getSkills(params?: { category?: string; q?: string; access?: 'free' | 'premium' | 'all'; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.access) searchParams.set('access', params.access);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    return this.request<{ skills: Skill[]; total: number; page: number; limit: number; totalPages: number }>(
      `/api/skills${queryString ? `?${queryString}` : ''}`
    );
  }

  async getSkill(id: string) {
    return this.request<{ skill: Skill }>(`/api/skills/${id}`);
  }

  async getSkillCategories() {
    return this.request<{ categories: string[] }>('/api/skills/categories');
  }

  // Saved Skills endpoints
  async getSavedSkills() {
    return this.request<{ skills: Skill[]; total: number }>('/api/user/saved-skills');
  }

  async saveSkill(id: string) {
    return this.request<{ message: string; savedCount: number }>(
      `/api/user/saved-skills/${id}`,
      { method: 'POST' }
    );
  }

  async removeSavedSkill(id: string) {
    return this.request<{ message: string; savedCount: number }>(
      `/api/user/saved-skills/${id}`,
      { method: 'DELETE' }
    );
  }

  async updateSavedSkillCategory(id: string, categoryId: string | null) {
    return this.request<{ message: string; categoryId: string | null }>(
      `/api/user/saved-skills/${id}/category`,
      {
        method: 'PATCH',
        body: JSON.stringify({ categoryId }),
      }
    );
  }

  // Custom Skills endpoints
  async getUserSkills() {
    return this.request<{ skills: CustomSkill[]; total: number }>(
      '/api/user/skills'
    );
  }

  async createUserSkill(data: {
    title: string;
    content: string;
    tags?: string[];
    categoryId?: string | null;
  }) {
    return this.request<{ skill: CustomSkill; message: string }>(
      '/api/user/skills',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateUserSkill(
    id: string,
    data: {
      title?: string;
      content?: string;
      tags?: string[];
      categoryId?: string | null;
    }
  ) {
    return this.request<{ skill: CustomSkill; message: string }>(
      `/api/user/skills/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteUserSkill(id: string) {
    return this.request<{ message: string }>(`/api/user/skills/${id}`, {
      method: 'DELETE',
    });
  }

  // Team Skills endpoints
  async getTeamSkills(teamId: string, params?: { category?: string; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.q) searchParams.set('q', params.q);

    const queryString = searchParams.toString();
    return this.request<{ skills: TeamSkill[]; total: number; categories: TeamCategory[] }>(
      `/api/teams/${teamId}/skills${queryString ? `?${queryString}` : ''}`
    );
  }

  async addTeamSkill(
    teamId: string,
    data: {
      sourceType?: 'library' | 'custom';
      sourceId?: string;
      title: string;
      content: string;
      categoryId?: string;
      tags?: string[];
      notes?: string;
    }
  ) {
    return this.request<{ message: string; skill: TeamSkill }>(
      `/api/teams/${teamId}/skills`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateTeamSkill(
    teamId: string,
    skillId: string,
    data: {
      title?: string;
      content?: string;
      categoryId?: string | null;
      tags?: string[];
      notes?: string;
      sourceType?: 'library' | 'custom';
    }
  ) {
    return this.request<{ message: string; skill: TeamSkill }>(
      `/api/teams/${teamId}/skills/${skillId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async removeTeamSkill(teamId: string, skillId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/skills/${skillId}`,
      { method: 'DELETE' }
    );
  }

  // Stripe endpoints
  async createCheckoutSession(tier: 'professional' | 'enterprise') {
    return this.request<{ sessionId: string; url: string }>('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
  }

  async getSubscription() {
    return this.request<{
      hasSubscription: boolean;
      tier: string;
      subscription?: {
        id: string;
        status: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
      };
    }>('/api/stripe/subscription');
  }

  async createPortalSession() {
    return this.request<{ url: string }>('/api/stripe/create-portal-session', {
      method: 'POST',
    });
  }

  async verifyCheckoutSession(sessionId: string) {
    return this.request<{ success: boolean; message: string; tier: string }>(
      '/api/stripe/verify-session',
      {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }
    );
  }

  async cancelSubscription(reason: string, feedback?: string) {
    return this.request<{ success: boolean; message: string; endsAt: string }>(
      '/api/stripe/cancel-subscription',
      {
        method: 'POST',
        body: JSON.stringify({ reason, feedback }),
      }
    );
  }

  async reactivateSubscription() {
    return this.request<{ success: boolean; message: string }>(
      '/api/stripe/reactivate-subscription',
      {
        method: 'POST',
      }
    );
  }

  // Team endpoints
  async createTeam(name: string) {
    return this.request<{ message: string; team: TeamSummary }>('/api/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getMyTeams() {
    return this.request<{ teams: TeamSummary[]; total: number }>('/api/teams/my');
  }

  async getTeam(id: string) {
    return this.request<{ team: Team; role: TeamRole; maxMembers: number }>(
      `/api/teams/${id}`
    );
  }

  async validateTeamCode(code: string) {
    return this.request<{ valid: boolean; teamName: string | null }>(
      `/api/teams/validate/${encodeURIComponent(code)}`
    );
  }

  async joinTeam(teamName: string, teamCode: string) {
    return this.request<{ message: string; team: TeamSummary }>('/api/teams/join', {
      method: 'POST',
      body: JSON.stringify({ teamName, teamCode }),
    });
  }

  async leaveTeam(teamId: string) {
    return this.request<{ message: string }>(`/api/teams/leave/${teamId}`, {
      method: 'POST',
    });
  }

  // Team invitation endpoints
  async inviteTeamMember(teamId: string, email: string, role: 'admin' | 'member' = 'member') {
    return this.request<{
      message: string;
      invitation: {
        id: string;
        email: string;
        role: string;
        expiresAt: string;
      };
    }>(`/api/teams/${teamId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  async getTeamInvitations(teamId: string) {
    return this.request<{
      invitations: Array<{
        id: string;
        email: string;
        role: string;
        invitedByName: string;
        createdAt: string;
        expiresAt: string;
      }>;
      total: number;
    }>(`/api/teams/${teamId}/invitations`);
  }

  async cancelInvitation(teamId: string, invitationId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/invitations/${invitationId}`,
      { method: 'DELETE' }
    );
  }

  // Team member management endpoints
  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member') {
    return this.request<{
      message: string;
      member: {
        userId: string;
        name: string;
        email: string;
        role: string;
      };
    }>(`/api/teams/${teamId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(teamId: string, userId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/members/${userId}`,
      { method: 'DELETE' }
    );
  }

  // Team category endpoints
  async getTeamCategories(teamId: string) {
    return this.request<{ categories: TeamCategory[]; total: number }>(
      `/api/teams/${teamId}/categories`
    );
  }

  async createTeamCategory(teamId: string, data: { name: string; color?: string }) {
    return this.request<{ message: string; category: TeamCategory }>(
      `/api/teams/${teamId}/categories`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateTeamCategory(teamId: string, categoryId: string, data: { name?: string; color?: string }) {
    return this.request<{ message: string; category: TeamCategory }>(
      `/api/teams/${teamId}/categories/${categoryId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteTeamCategory(teamId: string, categoryId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/categories/${categoryId}`,
      { method: 'DELETE' }
    );
  }

  // Team prompt endpoints
  async getTeamPrompts(teamId: string, params?: { category?: string; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.q) searchParams.set('q', params.q);

    const queryString = searchParams.toString();
    return this.request<{ prompts: TeamPrompt[]; total: number; categories: TeamCategory[] }>(
      `/api/teams/${teamId}/prompts${queryString ? `?${queryString}` : ''}`
    );
  }

  async addTeamPrompt(
    teamId: string,
    data: {
      sourceType?: 'library' | 'custom';
      sourceId?: string;
      title: string;
      content: string;
      categoryId?: string;
      keywords?: string[];
      industry?: string;
      role?: string;
      notes?: string;
    }
  ) {
    return this.request<{ message: string; prompt: TeamPrompt }>(
      `/api/teams/${teamId}/prompts`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateTeamPrompt(
    teamId: string,
    promptId: string,
    data: {
      title?: string;
      content?: string;
      categoryId?: string | null;
      keywords?: string[];
      notes?: string;
      sourceType?: 'library' | 'custom';
    }
  ) {
    return this.request<{ message: string; prompt: TeamPrompt }>(
      `/api/teams/${teamId}/prompts/${promptId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async removeTeamPrompt(teamId: string, promptId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/prompts/${promptId}`,
      { method: 'DELETE' }
    );
  }

  // Team prompt tagging endpoints
  async tagTeammate(teamId: string, promptId: string, userId: string, message?: string) {
    return this.request<{
      message: string;
      tag: {
        userId: string;
        userName: string;
        taggedBy: string;
        taggedByName: string;
        message?: string;
        taggedAt: string;
      };
    }>(`/api/teams/${teamId}/prompts/${promptId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ userId, message }),
    });
  }

  async removeTag(teamId: string, promptId: string, userId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/prompts/${promptId}/tags/${userId}`,
      { method: 'DELETE' }
    );
  }

  async getPromptsForMe(teamId: string) {
    return this.request<{
      prompts: Array<TeamPrompt & {
        tagInfo: {
          taggedBy: string;
          taggedByName: string;
          message?: string;
          taggedAt: string;
          seen: boolean;
        };
      }>;
      unseenCount: number;
      categories: TeamCategory[];
    }>(`/api/teams/${teamId}/prompts/for-me`);
  }

  async markTagSeen(teamId: string, promptId: string, userId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/prompts/${promptId}/tags/${userId}/seen`,
      { method: 'POST' }
    );
  }

  async getUnseenTagCount(teamId: string) {
    return this.request<{ count: number }>(
      `/api/teams/${teamId}/prompts/for-me/count`
    );
  }

  // Team question endpoints
  async getTeamQuestions(teamId: string, params?: { category?: string; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.q) searchParams.set('q', params.q);

    const queryString = searchParams.toString();
    return this.request<{ questions: TeamQuestion[]; total: number; categories: TeamCategory[] }>(
      `/api/teams/${teamId}/questions${queryString ? `?${queryString}` : ''}`
    );
  }

  async addTeamQuestion(
    teamId: string,
    data: {
      sourceType?: 'library' | 'custom';
      sourceId?: string;
      question: string;
      context?: string;
      categoryId?: string;
      tags?: string[];
      notes?: string;
    }
  ) {
    return this.request<{ message: string; question: TeamQuestion }>(
      `/api/teams/${teamId}/questions`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateTeamQuestion(
    teamId: string,
    questionId: string,
    data: {
      question?: string;
      categoryId?: string | null;
      notes?: string;
      context?: string;
      tags?: string[];
      sourceType?: 'custom';
    }
  ) {
    return this.request<{ message: string; question: TeamQuestion }>(
      `/api/teams/${teamId}/questions/${questionId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async removeTeamQuestion(teamId: string, questionId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/questions/${questionId}`,
      { method: 'DELETE' }
    );
  }

  // Notes endpoints
  async updatePromptNotes(teamId: string, promptId: string, notes: string) {
    return this.request<{ message: string; prompt: TeamPrompt }>(
      `/api/teams/${teamId}/prompts/${promptId}/notes`,
      {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      }
    );
  }

  async updateQuestionNotes(teamId: string, questionId: string, notes: string) {
    return this.request<{ message: string; question: TeamQuestion }>(
      `/api/teams/${teamId}/questions/${questionId}/notes`,
      {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      }
    );
  }

  // Workflow endpoints
  async getWorkflows(teamId: string, params?: { category?: string; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.q) searchParams.set('q', params.q);

    const queryString = searchParams.toString();
    return this.request<{ workflows: TeamWorkflow[]; categories: TeamCategory[]; total: number }>(
      `/api/teams/${teamId}/workflows${queryString ? `?${queryString}` : ''}`
    );
  }

  async createWorkflow(
    teamId: string,
    data: {
      name: string;
      description?: string;
      sharedWith?: 'team' | 'private';
      categoryId?: string;
    }
  ) {
    return this.request<{ message: string; workflow: TeamWorkflow }>(
      `/api/teams/${teamId}/workflows`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getWorkflow(teamId: string, workflowId: string) {
    return this.request<{
      workflow: TeamWorkflow;
      canEdit: boolean;
    }>(`/api/teams/${teamId}/workflows/${workflowId}`);
  }

  async updateWorkflow(
    teamId: string,
    workflowId: string,
    data: {
      name?: string;
      description?: string;
      sharedWith?: 'team' | 'private';
      categoryId?: string | null;
    }
  ) {
    return this.request<{ message: string; workflow: TeamWorkflow }>(
      `/api/teams/${teamId}/workflows/${workflowId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteWorkflow(teamId: string, workflowId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/workflows/${workflowId}`,
      { method: 'DELETE' }
    );
  }

  async addWorkflowStep(
    teamId: string,
    workflowId: string,
    data: {
      type: 'prompt' | 'instruction';
      // For prompt steps
      title?: string;
      content?: string;
      files?: string[];
      // For instruction steps
      instruction?: string;
    }
  ) {
    return this.request<{ message: string; step: WorkflowStep }>(
      `/api/teams/${teamId}/workflows/${workflowId}/steps`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateWorkflowStep(
    teamId: string,
    workflowId: string,
    stepId: string,
    data: {
      title?: string;
      content?: string;
      files?: string[];
      instruction?: string;
    }
  ) {
    return this.request<{ message: string; step: WorkflowStep }>(
      `/api/teams/${teamId}/workflows/${workflowId}/steps/${stepId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteWorkflowStep(teamId: string, workflowId: string, stepId: string) {
    return this.request<{ message: string }>(
      `/api/teams/${teamId}/workflows/${workflowId}/steps/${stepId}`,
      { method: 'DELETE' }
    );
  }

  async reorderWorkflowSteps(teamId: string, workflowId: string, stepIds: string[]) {
    return this.request<{ message: string; steps: WorkflowStep[] }>(
      `/api/teams/${teamId}/workflows/${workflowId}/reorder`,
      {
        method: 'POST',
        body: JSON.stringify({ stepIds }),
      }
    );
  }

  // Activity endpoints
  async getTeamActivity(
    teamId: string,
    params?: { limit?: number; offset?: number; type?: ActivityType }
  ) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.type) searchParams.set('type', params.type);

    const queryString = searchParams.toString();
    return this.request<{
      activities: TeamActivity[];
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    }>(`/api/teams/${teamId}/activity${queryString ? `?${queryString}` : ''}`);
  }

  async getUnreadActivityCount(teamId: string) {
    return this.request<{ count: number }>(`/api/teams/${teamId}/activity/unread`);
  }

  async markActivityRead(teamId: string, activityIds?: string[]) {
    return this.request<{ message: string; markedCount: number }>(
      `/api/teams/${teamId}/activity/mark-read`,
      {
        method: 'POST',
        body: JSON.stringify({ activityIds }),
      }
    );
  }

  // Analytics endpoints
  async getTeamAnalytics(teamId: string) {
    return this.request<TeamAnalytics>(`/api/teams/${teamId}/analytics`);
  }

  // Personal Workflow endpoints (for premium users)
  async getPersonalWorkflows(params?: { category?: string; q?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.q) searchParams.set('q', params.q);

    const queryString = searchParams.toString();
    return this.request<{ workflows: PersonalWorkflow[]; categories: WorkflowCategory[] }>(
      `/api/workflows${queryString ? `?${queryString}` : ''}`
    );
  }

  async createPersonalWorkflow(data: { name: string; description?: string; categoryId?: string }) {
    return this.request<{ workflow: PersonalWorkflow }>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPersonalWorkflow(workflowId: string) {
    return this.request<{ workflow: PersonalWorkflow }>(
      `/api/workflows/${workflowId}`
    );
  }

  async updatePersonalWorkflow(
    workflowId: string,
    data: { name?: string; description?: string; categoryId?: string | null }
  ) {
    return this.request<{ workflow: PersonalWorkflow }>(
      `/api/workflows/${workflowId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  // Personal workflow category endpoints
  async getWorkflowCategories() {
    return this.request<{ categories: WorkflowCategory[] }>('/api/workflows/categories');
  }

  async createWorkflowCategory(data: { name: string; color?: string }) {
    return this.request<{ category: WorkflowCategory }>('/api/workflows/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkflowCategory(categoryId: string, data: { name?: string; color?: string }) {
    return this.request<{ category: WorkflowCategory }>(
      `/api/workflows/categories/${categoryId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteWorkflowCategory(categoryId: string) {
    return this.request<{ message: string }>(
      `/api/workflows/categories/${categoryId}`,
      { method: 'DELETE' }
    );
  }

  async deletePersonalWorkflow(workflowId: string) {
    return this.request<{ message: string }>(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
    });
  }

  async addPersonalWorkflowStep(
    workflowId: string,
    data: {
      type: 'prompt' | 'instruction';
      title?: string;
      content?: string;
      files?: string[];
      instruction?: string;
    }
  ) {
    return this.request<{ step: WorkflowStep }>(
      `/api/workflows/${workflowId}/steps`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updatePersonalWorkflowStep(
    workflowId: string,
    stepId: string,
    data: {
      title?: string;
      content?: string;
      files?: string[];
      instruction?: string;
    }
  ) {
    return this.request<{ step: WorkflowStep }>(
      `/api/workflows/${workflowId}/steps/${stepId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deletePersonalWorkflowStep(workflowId: string, stepId: string) {
    return this.request<{ message: string }>(
      `/api/workflows/${workflowId}/steps/${stepId}`,
      { method: 'DELETE' }
    );
  }

  async reorderPersonalWorkflowSteps(workflowId: string, stepIds: string[]) {
    return this.request<{ steps: WorkflowStep[] }>(
      `/api/workflows/${workflowId}/reorder`,
      {
        method: 'POST',
        body: JSON.stringify({ stepIds }),
      }
    );
  }

  // Transcription endpoints (for audio file uploads)
  async transcribeAudio(audioBlob: Blob): Promise<{
    success: boolean;
    fileId: string;
    transcription: string;
    message: string;
  }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}/api/transcription/upload`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Transcription failed');
    }

    return data;
  }

  async appendTranscription(
    audioBlob: Blob,
    existingTranscription: string
  ): Promise<{
    success: boolean;
    fileId: string;
    transcription: string;
    newSegment: string;
    message: string;
  }> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('existingTranscription', existingTranscription);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}/api/transcription/append`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Transcription append failed');
    }

    return data;
  }

  // ─── Prompt Builder endpoints (SSE streaming) ───

  /**
   * Helper: make a POST request that returns an SSE stream.
   * Calls onChunk for each text chunk, onDone when complete.
   */
  private async streamRequest(
    endpoint: string,
    body: Record<string, unknown>,
    onChunk: (text: string) => void,
    onDone: (result: { fullText: string; qualityScore: QualityScore }) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });

    // If the response is not SSE (e.g., validation error), handle as JSON
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      const data = await response.json();
      throw new Error(data.error || 'Generation failed');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response stream available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                onError(data.error);
                return;
              }

              if (data.done) {
                onDone({
                  fullText: data.fullText || fullText,
                  qualityScore: data.qualityScore,
                });
                return;
              }

              if (data.text) {
                fullText += data.text;
                onChunk(data.text);
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async analyseInputs(
    params: {
      type: 'form' | 'freeform';
      modelId: string;
      goalCategory: string;
      inputs: Record<string, unknown>;
    }
  ): Promise<AnalysisResult> {
    return this.request<AnalysisResult>('/api/builder/analyse', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async analyseExisting(
    params: {
      existingPrompt: string;
      modelId: string;
      goalCategory: string;
    }
  ): Promise<ExistingAnalysisResult> {
    return this.request<ExistingAnalysisResult>('/api/builder/analyse-existing', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async generatePrompt(
    params: {
      type: 'form' | 'freeform';
      modelId: string;
      goalCategory: string;
      inputs: Record<string, unknown>;
      refinementAnswers?: Array<{ questionId: string; question: string; answer: string }>;
    },
    onChunk: (text: string) => void,
    onDone: (result: { fullText: string; qualityScore: QualityScore }) => void,
    onError: (error: string) => void
  ): Promise<void> {
    return this.streamRequest('/api/builder/generate', params, onChunk, onDone, onError);
  }

  async improvePrompt(
    params: {
      existingPrompt: string;
      modelId: string;
      goalCategory: string;
      diagnosisContext?: {
        diagnosis?: Array<{ dimension: string; issue: string; suggestion: string }>;
        answers?: Array<{ questionId: string; question: string; answer: string }>;
      };
    },
    onChunk: (text: string) => void,
    onDone: (result: { fullText: string; qualityScore: QualityScore }) => void,
    onError: (error: string) => void
  ): Promise<void> {
    return this.streamRequest('/api/builder/improve', params, onChunk, onDone, onError);
  }

  async scorePrompt(
    params: {
      promptText: string;
      modelId: string;
      goalCategory: string;
    }
  ): Promise<AIScoreResult> {
    return this.request<AIScoreResult>('/api/builder/score', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async refinePrompt(
    params: {
      currentPrompt: string;
      refinementType?: string;
      customInstruction?: string;
      modelId: string;
    },
    onChunk: (text: string) => void,
    onDone: (result: { fullText: string; qualityScore: QualityScore }) => void,
    onError: (error: string) => void
  ): Promise<void> {
    return this.streamRequest('/api/builder/refine', params, onChunk, onDone, onError);
  }
}

// QualityScore type for builder responses
interface QualityScore {
  clarity: number;
  completeness: number;
  specificity: number;
  structure: number;
  overall: number;
}

// Analysis result types for refining questions
export interface AnalysisQuestion {
  id: string;
  question: string;
  reason: string;
  type: 'text' | 'choice';
  choices: string[] | null;
  priority: 'high' | 'medium';
}

export interface AnalysisResult {
  needsQuestions: boolean;
  questions: AnalysisQuestion[];
  inputSummary: string;
}

export interface DiagnosisItem {
  dimension: string;
  issue: string;
  suggestion: string;
}

export interface ExistingAnalysisResult {
  needsQuestions: boolean;
  diagnosis: DiagnosisItem[];
  questions: AnalysisQuestion[];
}

export interface ScoreSuggestion {
  dimension: string;
  suggestion: string;
  impact: 'high' | 'medium';
}

export interface AIScoreResult {
  scores: QualityScore;
  suggestions: ScoreSuggestion[];
}

export const api = new ApiClient();
