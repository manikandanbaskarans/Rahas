import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - attach access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !('_retry' in originalRequest)) {
      (originalRequest as unknown as Record<string, unknown>)._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefresh } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefresh);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: {
    email: string;
    name: string;
    auth_key: string;
    encrypted_vault_key: string;
    encrypted_private_key: string;
    public_key: string;
    kdf_iterations: number;
    kdf_memory: number;
  }) => api.post('/auth/register', data),

  login: (data: { email: string; auth_key: string }) =>
    api.post('/auth/login', data),

  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),

  logout: () => api.post('/auth/logout'),

  mfaSetup: (type: string) => api.post('/auth/mfa/setup', { type }),

  mfaVerify: (data: { mfa_session_token: string; code: string }) =>
    api.post('/auth/mfa/verify', data),

  changePassword: (data: {
    current_auth_key: string;
    new_auth_key: string;
    new_encrypted_vault_key: string;
    new_encrypted_private_key: string;
  }) => api.post('/auth/password/change', data),
};

// Vault API
export const vaultAPI = {
  list: () => api.get('/vaults'),
  create: (data: {
    name_encrypted: string;
    type: string;
    description_encrypted?: string;
    icon?: string;
  }) => api.post('/vaults', data),
  get: (id: string) => api.get(`/vaults/${id}`),
  update: (id: string, data: {
    name_encrypted?: string;
    description_encrypted?: string;
    icon?: string;
    safe_for_travel?: boolean;
  }) => api.put(`/vaults/${id}`, data),
  delete: (id: string) => api.delete(`/vaults/${id}`),
  getDetails: (id: string) => api.get(`/vaults/${id}/details`),
};

// Secrets API
export const secretsAPI = {
  list: (vaultId: string, params?: {
    folder_id?: string;
    sort_by?: string;
    sort_order?: string;
    category?: string;
  }) => api.get(`/vaults/${vaultId}/secrets`, { params }),
  create: (vaultId: string, data: {
    type: string;
    name_encrypted: string;
    data_encrypted: string;
    encrypted_item_key: string;
    metadata_encrypted?: string;
    folder_id?: string;
    favorite?: boolean;
  }) => api.post(`/vaults/${vaultId}/secrets`, data),
  get: (id: string) => api.get(`/secrets/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/secrets/${id}`, data),
  delete: (id: string) => api.delete(`/secrets/${id}`),
  versions: (id: string) => api.get(`/secrets/${id}/versions`),
  createFolder: (vaultId: string, data: { name_encrypted: string; parent_folder_id?: string }) =>
    api.post(`/vaults/${vaultId}/folders`, data),
  listFolders: (vaultId: string) => api.get(`/vaults/${vaultId}/folders`),
  // Archive / Restore / Delete
  archive: (id: string) => api.post(`/secrets/${id}/archive`),
  unarchive: (id: string) => api.post(`/secrets/${id}/unarchive`),
  listArchived: () => api.get('/secrets/archived'),
  listDeleted: () => api.get('/secrets/deleted'),
  restore: (id: string) => api.post(`/secrets/${id}/restore`),
  permanentDelete: (id: string) => api.delete(`/secrets/${id}/permanent`),
  // Item Actions
  move: (id: string, data: { target_vault_id: string; encrypted_item_key: string }) =>
    api.post(`/secrets/${id}/move`, data),
  duplicate: (id: string, data: { name_encrypted: string; encrypted_item_key: string; target_vault_id?: string }) =>
    api.post(`/secrets/${id}/duplicate`, data),
  sharingHistory: (id: string) => api.get(`/secrets/${id}/sharing-history`),
};

// Tags API
export const tagsAPI = {
  list: () => api.get('/tags'),
  create: (data: { name: string; color?: string }) => api.post('/tags', data),
  update: (id: string, data: { name?: string; color?: string }) =>
    api.put(`/tags/${id}`, data),
  delete: (id: string) => api.delete(`/tags/${id}`),
  assignToSecret: (secretId: string, tagIds: string[]) =>
    api.post(`/tags/secrets/${secretId}/tags`, { tag_ids: tagIds }),
  removeFromSecret: (secretId: string, tagId: string) =>
    api.delete(`/tags/secrets/${secretId}/tags/${tagId}`),
};

// Notifications API
export const notificationsAPI = {
  list: (params?: { limit?: number; offset?: number }) =>
    api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (notificationIds: string[]) =>
    api.post('/notifications/mark-read', { notification_ids: notificationIds }),
  markAllRead: () => api.post('/notifications/mark-all-read'),
};

// Sharing API
export const sharingAPI = {
  share: (secretId: string, data: {
    shared_with_user_id?: string;
    shared_with_team_id?: string;
    encrypted_item_key_for_recipient: string;
    permission: string;
    expires_at?: string;
  }) => api.post(`/secrets/${secretId}/share`, data),
  sharedWithMe: () => api.get('/shared-with-me'),
  revoke: (shareId: string) => api.delete(`/shares/${shareId}`),
  update: (shareId: string, data: { permission?: string; expires_at?: string }) =>
    api.put(`/shares/${shareId}`, data),
  createShareLink: (secretId: string, data: {
    expires_in_hours: number;
    max_views?: number;
    encrypted_item_key_for_link: string;
  }) => api.post(`/secrets/${secretId}/share-link`, data),
  accessShareLink: (token: string) => api.get(`/share-links/${token}`),
};

// Admin API
export const adminAPI = {
  createOrg: (data: { name: string }) => api.post('/org', data),
  listUsers: (orgId: string) => api.get('/org/users', { params: { org_id: orgId } }),
  inviteUser: (orgId: string, data: { email: string; role: string }) =>
    api.post('/org/users/invite', data, { params: { org_id: orgId } }),
  updatePasswordPolicy: (orgId: string, data: Record<string, unknown>) =>
    api.put('/org/policies/password', data, { params: { org_id: orgId } }),
  updateAccessPolicy: (orgId: string, data: Record<string, unknown>) =>
    api.put('/org/policies/access', data, { params: { org_id: orgId } }),
  getAuditLogs: (orgId: string, params: Record<string, unknown>) =>
    api.get('/org/audit-logs', { params: { org_id: orgId, ...params } }),
  getReports: (orgId: string) =>
    api.get('/org/reports', { params: { org_id: orgId } }),
};

// Teams API
export const teamsAPI = {
  list: (orgId: string) => api.get('/org/teams', { params: { org_id: orgId } }),
  create: (orgId: string, data: { name: string; encrypted_team_key?: string }) =>
    api.post('/org/teams', data, { params: { org_id: orgId } }),
  addMember: (orgId: string, teamId: string, data: {
    user_id: string;
    encrypted_team_key_for_user: string;
    role: string;
  }) => api.post(`/org/teams/${teamId}/members`, data, { params: { org_id: orgId } }),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/org/teams/${teamId}/members/${userId}`),
};

// Travel API
export const travelAPI = {
  enable: () => api.post('/travel/enable'),
  disable: () => api.post('/travel/disable'),
  status: () => api.get('/travel/status'),
};

// Import API
export const importAPI = {
  bulkCreate: (data: { vault_id: string; items: unknown[] }) =>
    api.post('/import/bulk-create', data),
};

// Profile API
export const profileAPI = {
  get: () => api.get('/profile/me'),
  update: (data: {
    name?: string;
    avatar_url?: string | null;
    language_pref?: string;
    email_notifications?: boolean;
  }) => api.put('/profile/me', data),
  getDevices: () => api.get('/profile/devices'),
  revokeDevice: (deviceId: string) => api.delete(`/profile/devices/${deviceId}`),
  deleteAccount: (authKey: string) =>
    api.delete('/profile/account', { data: { auth_key: authKey } }),
};

// Tools API
export const toolsAPI = {
  generatePassword: (data: {
    length?: number;
    include_uppercase?: boolean;
    include_lowercase?: boolean;
    include_numbers?: boolean;
    include_symbols?: boolean;
    exclude_ambiguous?: boolean;
  }) => api.post('/tools/generate-password', data),
  checkBreach: (hashPrefix: string) =>
    api.post('/tools/check-breach', { password_hash_prefix: hashPrefix }),
  healthReport: () => api.get('/tools/health-report'),
};
