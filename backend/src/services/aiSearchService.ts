import OpenAI from "openai";
import type { SearchResult, SearchResponse, SearchRequest } from "../types/index.js";
import { semanticSearch, type SearchDependencies } from "./searchEngine.js";

/**
 * AI-powered search using RAG (Retrieval-Augmented Generation).
 *
 * 1. Use vector search to retrieve candidate hadiths
 * 2. Send candidates + user query to GPT-4o-mini
 * 3. LLM re-ranks and selects the most relevant hadiths
 */

const SYSTEM_PROMPT = `You are a hadith search assistant. Given a user's search query and a list of candidate hadiths, your job is to:

1. Select the hadiths that are most relevant to the user's query
2. Rank them by relevance (most relevant first)
3. For each selected hadith, provide a brief explanation (1-2 sentences) of why it's relevant

Respond in JSON format:
{
  "results": [
    {
      "index": 0,
      "relevance_explanation": "This hadith directly discusses patience during calamity..."
    }
  ]
}

Rules:
- Only include hadiths that are genuinely relevant to the query
- Maximum 10 results
- The "index" refers to the position in the candidate list (0-based)
- Write explanations in the same language as the user's query
- If no hadiths are relevant, return {"results": []}`;

export class AiSearchService {
  private client: OpenAI;

  constructor(client?: OpenAI) {
    this.client = client ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async search(
    request: SearchRequest,
    deps: SearchDependencies
  ): Promise<SearchResponse & { ai_explanations?: Record<string, string> }> {
    const startTime = Date.now();

    // Step 1: Get candidates via vector search (fetch more, lower threshold)
    const candidateRequest = {
      ...request,
      limit: 30,
      offset: 0,
      min_score: 0.05,
    };

    const candidates = await semanticSearch(candidateRequest, deps);

    if (candidates.results.length === 0) {
      return {
        ...candidates,
        processing_time_ms: Date.now() - startTime,
        ai_explanations: {},
      };
    }

    // Step 2: Build context for LLM
    const candidateTexts = candidates.results.map((r: SearchResult, i: number) => {
      const h = r.hadith;
      const text = h.text_indonesian || h.text_english || h.text_arabic || "";
      return `[${i}] ${h.collection_name} #${h.hadith_number}: ${text.slice(0, 300)}`;
    }).join("\n\n");

    const userMessage = `Query: "${request.query}"\n\nCandidate hadiths:\n${candidateTexts}`;

    // Step 3: Call LLM
    let aiResults: Array<{ index: number; relevance_explanation: string }> = [];
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        aiResults = parsed.results || [];
      }
    } catch (error) {
      console.error("[AiSearch] LLM call failed, falling back to vector results:", error);
      // Fallback: return vector search results as-is
      return {
        ...candidates,
        results: candidates.results.slice(0, request.limit),
        processing_time_ms: Date.now() - startTime,
      };
    }

    // Step 4: Re-order results based on LLM ranking
    const rerankedResults: SearchResult[] = [];
    const explanations: Record<string, string> = {};

    for (const aiResult of aiResults) {
      const candidate = candidates.results[aiResult.index];
      if (candidate) {
        rerankedResults.push(candidate);
        explanations[candidate.hadith.id] = aiResult.relevance_explanation;
      }
    }

    // Apply pagination
    const paginated = rerankedResults.slice(request.offset, request.offset + request.limit);
    const processingTimeMs = Date.now() - startTime;

    return {
      results: paginated,
      total_count: rerankedResults.length,
      query: request.query,
      processing_time_ms: processingTimeMs,
      page: Math.floor(request.offset / request.limit) + 1,
      total_pages: Math.ceil(rerankedResults.length / request.limit),
      ai_explanations: explanations,
    };
  }
}
