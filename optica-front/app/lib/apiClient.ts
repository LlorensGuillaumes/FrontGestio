// app/lib/apiClient.ts
import { api } from "./api";

export async function apiGet<T>(url: string, params?: Record<string, any>) {
  const res = await api.get<T>(url, { params });
  return res.data;
}

export async function apiPost<T>(url: string, body?: any) {
  const res = await api.post<T>(url, body);
  return res.data;
}

export async function apiPut<T>(url: string, body?: any) {
  const res = await api.put<T>(url, body);
  return res.data;
}

export async function apiDelete<T>(url: string) {
  const res = await api.delete<T>(url);
  return res.data;
}
