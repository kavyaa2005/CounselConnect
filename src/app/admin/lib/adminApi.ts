// Admin API client — thin wrapper around the shared api client so every
// admin screen pulls live data from /api/admin/*.
import { api } from '../../lib/api';
import { useEffect, useState, useCallback } from 'react';

export const adminApi = {
  dashboard:    () => api.get('/admin/dashboard'),
  analytics:    () => api.get('/admin/analytics'),
  reports:      () => api.get('/admin/reports'),
  auditLog:     () => api.get('/admin/audit-log'),

  users:        () => api.get('/admin/users'),
  user:         (id: string) => api.get(`/admin/users/${id}`),
  createUser:   (body: any) => api.post('/admin/users', body),
  updateUser:   (id: string, body: any) => api.put(`/admin/users/${id}`, body),
  deleteUser:   (id: string) => api.delete(`/admin/users/${id}`),

  counselors:       () => api.get('/admin/counselors'),
  counselor:        (id: string) => api.get(`/admin/counselors/${id}`),
  createCounselor:  (body: any) => api.post('/admin/counselors', body),
  updateCounselor:  (id: string, body: any) => api.put(`/admin/counselors/${id}`, body),
  deleteCounselor:  (id: string) => api.delete(`/admin/counselors/${id}`),

  appointments:      () => api.get('/admin/appointments'),
  updateAppointment: (id: string, body: any) => api.put(`/admin/appointments/${id}`, body),
  deleteAppointment: (id: string) => api.delete(`/admin/appointments/${id}`),
  sessions:          () => api.get('/admin/sessions'),
  calls:             () => api.get('/admin/calls'),

  applications:        (status?: string) => api.get(`/admin/applications${status ? `?status=${status}` : ''}`),
  application:         (id: string) => api.get(`/admin/applications/${id}`),
  approveApplication:  (id: string, note = '') => api.put(`/admin/applications/${id}/approve`, { note }),
  rejectApplication:   (id: string, note = '') => api.put(`/admin/applications/${id}/reject`, { note }),

  /** Opens a private certificate in a new tab (auth header required, so fetch as blob). */
  openApplicationDoc: async (appId: string, docId: string) => {
    const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/admin/applications/${appId}/documents/${docId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('cc_token')}` },
    });
    if (!res.ok) throw new Error('Could not open that document');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  feedback:       () => api.get('/admin/feedback'),
  updateFeedback: (id: string, body: any) => api.put(`/admin/feedback/${id}`, body),
  deleteFeedback: (id: string) => api.delete(`/admin/feedback/${id}`),

  payments: () => api.get('/admin/payments'),

  notifications:      () => api.get('/admin/notifications'),
  sendNotification:   (body: any) => api.post('/admin/notifications', body),
  readNotification:   (id: string) => api.put(`/admin/notifications/${id}/read`, {}),
  deleteNotification: (id: string) => api.delete(`/admin/notifications/${id}`),

  settings:       () => api.get('/admin/settings'),
  updateSettings: (body: any) => api.put('/admin/settings', body),

  profile:        () => api.get('/admin/profile'),
  updateProfile:  (body: any) => api.put('/admin/profile', body),
  changePassword: (body: any) => api.put('/admin/profile/password', body),

  downloadReport: async (type: string) => {
    const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/admin/reports/${type}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('cc_token')}` },
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

/** Fetch-on-mount helper with loading/error/refetch. */
export function useAdminData<T = any>(
  loader: () => Promise<{ data: T }>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await loader();
      setData(res.data);
    } catch (e: any) {
      setError(e?.message || 'Could not load data');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run, setData };
}

/** Exports any array of objects as a CSV download, client-side. */
export function exportCsv(filename: string, rows: any[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => esc(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
