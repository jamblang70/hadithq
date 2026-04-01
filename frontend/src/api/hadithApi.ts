import type { SearchParams, SearchResponse, Hadith, Collection } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || res.statusText);
  }
  return res.json();
}

export async function searchHadith(params: SearchParams): Promise<SearchResponse> {
  return request<SearchResponse>(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function aiSearchHadith(params: SearchParams): Promise<SearchResponse & { ai_explanations?: Record<string, string> }> {
  return request<SearchResponse & { ai_explanations?: Record<string, string> }>(`${API_BASE}/ai-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function getCollections(): Promise<Collection[]> {
  const data = await request<{ collections: Collection[] }>(`${API_BASE}/collections`);
  return data.collections;
}

export async function getHadithById(id: string): Promise<Hadith> {
  const data = await request<{ hadith: Hadith }>(`${API_BASE}/hadith/${encodeURIComponent(id)}`);
  return data.hadith;
}

export async function lookupHadith(collection: string, number: number): Promise<Hadith> {
  const data = await request<{ hadith: Hadith }>(`${API_BASE}/hadith/lookup/${encodeURIComponent(collection)}/${number}`);
  return data.hadith;
}

export async function getDailyHadith(): Promise<Hadith> {
  const data = await request<{ hadith: Hadith }>(`${API_BASE}/daily`);
  return data.hadith;
}

export async function getStats(): Promise<{ totalHadith: number; totalCollections: number }> {
  return request<{ totalHadith: number; totalCollections: number }>(`${API_BASE}/stats`);
}
