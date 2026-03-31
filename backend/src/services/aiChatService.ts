import OpenAI from "openai";
import type { SearchResult, SearchRequest } from "../types/index.js";
import { semanticSearch, type SearchDependencies } from "./searchEngine.js";

const SYSTEM_PROMPT = `Kamu adalah asisten ahli hadis. Tugasmu menjawab pertanyaan pengguna tentang hadis dengan mengutip hadis-hadis yang relevan dari database.

Aturan:
- Jawab dalam bahasa yang sama dengan pertanyaan pengguna
- Selalu kutip hadis yang relevan dengan menyebutkan nama kitab dan nomor hadis
- Jika tidak ada hadis yang relevan, katakan dengan jujur
- Berikan penjelasan singkat tentang konteks hadis
- Jawab dengan sopan dan ilmiah
- Jangan mengarang hadis yang tidak ada di database`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class AiChatService {
  private client: OpenAI;

  constructor(client?: OpenAI) {
    this.client = client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async chat(
    userMessage: string,
    history: ChatMessage[],
    deps: SearchDependencies
  ): Promise<{ reply: string; sources: Array<{ collection: string; number: number; text: string }> }> {
    // Step 1: Search for relevant hadiths
    const searchRequest: SearchRequest = {
      query: userMessage,
      language: "id",
      collections: [],
      grade_filter: [],
      limit: 5,
      offset: 0,
      min_score: 0.05,
    };

    const searchResults = await semanticSearch(searchRequest, deps);

    // Step 2: Build context from search results
    const hadithContext = searchResults.results.map((r: SearchResult, i: number) => {
      const h = r.hadith;
      const text = h.text_indonesian || h.text_english || "";
      return `[Hadis ${i + 1}] ${h.collection_name} #${h.hadith_number} (${h.grade}):\n${text}`;
    }).join("\n\n");

    // Step 3: Build messages
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `Berikut hadis-hadis yang relevan dari database:\n\n${hadithContext}\n\nGunakan hadis-hadis di atas untuk menjawab pertanyaan pengguna. Kutip nomor hadis saat mengutip.` },
    ];

    // Add conversation history (last 6 messages)
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: "user", content: userMessage });

    // Step 4: Call LLM
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 800,
    });

    const reply = completion.choices[0]?.message?.content || "Maaf, saya tidak bisa menjawab saat ini.";

    // Extract sources
    const sources = searchResults.results.slice(0, 5).map((r: SearchResult) => ({
      hadith_id: r.hadith.id,
      collection: r.hadith.collection_name,
      number: r.hadith.hadith_number,
      text: (r.hadith.text_indonesian || r.hadith.text_english || "").slice(0, 150),
    }));

    return { reply, sources };
  }
}
