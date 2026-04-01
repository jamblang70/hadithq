import { useRef, useEffect } from "react";
import { sendChatMessage, type ChatMessage, type ChatResponse } from "../api/chatApi";
import { getUserFacingErrorMessage } from "../utils/errorMessages";

export interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
}

interface Props {
  onBack: () => void;
  onOpenHadith: (hadithId: string) => void;
  messages: DisplayMessage[];
  onMessagesChange: (messages: DisplayMessage[]) => void;
}

export default function AiChat({ onBack, onOpenHadith, messages, onMessagesChange }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = inputRef.current?.value.trim();
    if (!text) return;

    const userMsg: DisplayMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    onMessagesChange(next);
    if (inputRef.current) inputRef.current.value = "";

    // loading indicator
    const loadingMsg: DisplayMessage = { role: "assistant", content: "__loading__" };
    onMessagesChange([...next, loadingMsg]);

    try {
      const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await sendChatMessage(text, history);
      const assistantMsg: DisplayMessage = {
        role: "assistant",
        content: result.reply,
        sources: result.sources,
      };
      onMessagesChange([...next, assistantMsg]);
    } catch (err) {
      const errMsg = getUserFacingErrorMessage(err);
      onMessagesChange([...next, { role: "assistant", content: `⚠️ ${errMsg}` }]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isLoading = messages.at(-1)?.content === "__loading__";

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
            {msg.content === "__loading__" ? (
              <div className="chat-bubble-content chat-typing">
                <span className="typing-dots">●</span> Mencari hadis & menyusun jawaban...
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input">
        <textarea
          ref={inputRef}
          onKeyDown={handleKeyDown}
          placeholder="Tanyakan tentang hadis..."
          rows={2}
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading} className="chat-send-btn" type="button">
          {isLoading ? "..." : "Kirim"}
        </button>
      </div>
    </div>
  );
}
