import { getToken } from './auth';

type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

const API_BASE = '/api/pf';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  headers.set('accept', 'application/json');
  if (!headers.has('content-type') && init?.body) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    let details: any = null;
    try {
      details = text ? JSON.parse(text) : null;
    } catch {
      details = text || null;
    }
    const err: ApiError = {
      status: res.status,
      message: typeof details?.message === 'string' ? details.message : `Request failed (${res.status})`,
      details,
    };
    throw err;
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}

export const api = {
  login: (body: { usernameOrEmail: string; password: string }) =>
    apiFetch<{ token: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => apiFetch<any>('/auth/me'),

  rootFolder: () => apiFetch<any>('/folders/root'),
  getFolder: (folderId: string) => apiFetch<any>(`/folders/${encodeURIComponent(folderId)}`),
  folderChildren: (folderId: string) => apiFetch<any>(`/folders/${folderId}/children`),

  listDocuments: (folderId: string) => apiFetch<any>(`/documents?folderId=${encodeURIComponent(folderId)}`),

  createDocument: (body: { folderId: string; filename: string; title?: string }) =>
    apiFetch<any>('/documents', { method: 'POST', body: JSON.stringify(body) }),

  commitVersion: (versionId: string) =>
    apiFetch<any>('/documents/versions/commit', { method: 'POST', body: JSON.stringify({ versionId }) }),

  docVersions: (documentId: string) => apiFetch<any>(`/documents/${documentId}/versions`),
  downloadUrl: (versionId: string) => apiFetch<any>(`/documents/versions/${versionId}/download-url`),

  ocrStatus: (versionId: string) => apiFetch<any>(`/documents/versions/${versionId}/ocr`),
  ocrPages: (versionId: string) => apiFetch<any>(`/documents/versions/${versionId}/ocr/pages`),

  search: (params: { q: string; folderId?: string; filename?: string; allVersions?: boolean }) => {
    const usp = new URLSearchParams();
    usp.set('q', params.q);
    if (params.folderId) usp.set('folderId', params.folderId);
    if (params.filename) usp.set('filename', params.filename);
    if (params.allVersions) usp.set('allVersions', 'true');
    return apiFetch<any>(`/search?${usp.toString()}`);
  },
};

export async function putToPresignedUrl(url: string, file: File) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/pdf' },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
}
