import OpenAI from "openai";
import type { SearchResult, SearchRequest } from "../types/index.js";
import { semanticSearch, type SearchDependencies } from "./searchEngine.js";

const SYSTEM_PROMPT = `Kamu adalah asisten ahli hadis. Jawab pertanyaan tentang hadis dengan mengutip hadis yang relevan. Gunakan format [REF-N] untuk referensi.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class AiChatService {
  private client: OpenAI;

  constructor(client?: OpenAI) {
    this.client = client ?? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });
  }

  async chat(
    userMessage: string,
    history: ChatMessage[],
    deps: SearchDependencies
  ): Promise<{ reply: string; sources: Array<{ hadith_id: string; collection: string; number: number; text: string }> }> {
    // Step 1: Search for relevant hadiths
    const searchRequest: SearchRequest = {
      query: userMessage,
      language: "id",
      collections: [],
      grade_filter: [],
      limit: 5,
      offset: 0,
      min_score: 0.3,
    };

    const searchResults = await semanticSearch(searchRequest, deps);

    // Step 2: Build context from search results — limit text length for MiniMax compatibility
    const hadithContext = searchResults.results.map((r: SearchResult, i: number) => {
      const h = r.hadith;
      const text = (h.text_indonesian || h.text_english || "").slice(0, 200); // Limit to 200 chars
      return `[REF-${i + 1}] ${h.collection_name} #${h.hadith_number}: ${text}`;
    }).join("\n\n");

    // Step 3: Build messages — combine system prompts into one for MiniMax compatibility
    const combinedSystemPrompt = `${SYSTEM_PROMPT}

Berikut hadis-hadis yang relevan dari database:

${hadithContext}

Saat mengutip hadis, gunakan format [REF-N] (contoh: [REF-1], [REF-2]) agar referensi bisa dilacak. Hanya kutip hadis yang benar-benar relevan dengan pertanyaan.`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: combinedSystemPrompt },
    ];

    // Add conversation history (last 6 messages)
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: "user", content: userMessage });

    // Step 4: Call LLM
    const completion = await this.client.chat.completions.create({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      messages,
    });

    const reply = completion.choices[0]?.message?.content || "Maaf, saya tidak bisa menjawab saat ini.";

    // Step 5: Extract only the sources actually cited in the reply
    const citedIndices = new Set<number>();
    const refPattern = /\[REF-(\d+)\]/g;
    let match;
    while ((match = refPattern.exec(reply)) !== null) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < searchResults.results.length) {
        citedIndices.add(idx);
      }
    }

    // If AI didn't use REF tags, fall back to top results that were provided
    const indicesToUse = citedIndices.size > 0
      ? Array.from(citedIndices)
      : searchResults.results.map((_, i) => i);

    const sources = indicesToUse.map((i) => {
      const r = searchResults.results[i];
      return {
        hadith_id: r.hadith.id,
        collection: r.hadith.collection_name,
        number: r.hadith.hadith_number,
        text: (r.hadith.text_indonesian || r.hadith.text_english || "").slice(0, 150),
      };
    });

    return { reply, sources };
  }
}
