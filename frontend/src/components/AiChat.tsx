import { useState, useRef, useEffect } from "react";
import { sendChatMessage, type ChatMessage, type ChatResponse } from "../api/chatApi";

interface Props {
  onBack: () => void;
  onOpenHadith: (hadithId: string) => void;
}

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
}

export default function AiChat({ onBack, onOpenHadith }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: DisplayMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await sendChatMessage(text, history);
      const assistantMsg: DisplayMessage = {
        role: "assistant",
        content: result.reply,
        sources: result.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Gagal mengirim pesan";
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <button onClick={onBack} className="back-btn" type="button">← Kembali</button>
        <h2>🤖 Tanya Hadis</h2>
        <p className="ai-chat-subtitle">Tanyakan apa saja tentang hadis, AI akan menjawab dengan mengutip sumber</p>
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <p>Mulai percakapan dengan bertanya tentang hadis.</p>
            <p className="ai-chat-examples">Contoh: "Apa hadis tentang keutamaan sabar?" atau "Bagaimana adab makan menurut hadis?"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <div className="chat-bubble-content">{msg.content}</div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="chat-sources">
                <span className="chat-sources-label">📚 Sumber:</span>
                {msg.sources.map((s, j) => (
                  <button
                    key={j}
                    className="chat-source-tag"
                    onClick={() => onOpenHadith(s.hadith_id)}
                    type="button"
                    title="Buka hadis ini dalam mode baca"
                  >
                    {s.collection} #{s.number} ↗
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant">
            <div className="chat-bubble-content chat-typing">AI sedang berpikir...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tanyakan tentang hadis..."
          rows={2}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="chat-send-btn" type="button">
          {loading ? "..." : "Kirim"}
        </button>
      </div>
    </div>
  );
}
