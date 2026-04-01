import type { SearchParams, SearchResponse, Hadith, Collection } from "../types";
import { requestJson } from "./http";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export async function searchHadith(params: SearchParams): Promise<SearchResponse> {
  return requestJson<SearchResponse>(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function aiSearchHadith(params: SearchParams): Promise<SearchResponse & { ai_explanations?: Record<string, string> }> {
  return requestJson<SearchResponse & { ai_explanations?: Record<string, string> }>(`${API_BASE}/ai-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export async function getCollections(): Promise<Collection[]> {
  const data = await requestJson<{ collections: Collection[] }>(`${API_BASE}/collections`);
  return data.collections;
}

export async function getHadithById(id: string): Promise<Hadith> {
  const data = await requestJson<{ hadith: Hadith }>(`${API_BASE}/hadith/${encodeURIComponent(id)}`);
  return data.hadith;
}

export async function getDailyHadith(): Promise<Hadith> {
  const data = await requestJson<{ hadith: Hadith }>(`${API_BASE}/daily`);
  return data.hadith;
}

export async function getStats(): Promise<{ totalHadith: number; totalCollections: number }> {
  return requestJson<{ totalHadith: number; totalCollections: number }>(`${API_BASE}/stats`);
}
