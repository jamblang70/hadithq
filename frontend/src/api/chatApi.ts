import { requestJson } from "./http";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  sources: Array<{ hadith_id: string; collection: string; number: number; text: string }>;
}

export async function sendChatMessage(message: string, history: ChatMessage[]): Promise<ChatResponse> {
  return requestJson<ChatResponse>(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
}
