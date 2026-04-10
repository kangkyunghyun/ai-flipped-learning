import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

type Message = {
  role: "user" | "model";
  text: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
};

const STORAGE_KEY_CHATS = "ai_tutor_chats";
const STORAGE_KEY_CURRENT_CHAT_ID = "ai_tutor_current_chat_id";
const DEFAULT_CHAT: ChatSession = { id: "default", title: "새로운 개념 학습", messages: [] };

function App() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  // 여러 개의 채팅 세션을 관리 (로컬 스토리지 연동)
  const [chats, setChats] = useState<ChatSession[]>(() => {
    try {
      const savedChats = localStorage.getItem(STORAGE_KEY_CHATS);
      if (savedChats) {
        const parsed = JSON.parse(savedChats);
        // 배열이면서 최소 1개 이상의 데이터가 있는지 확인 (방어 코드)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return [DEFAULT_CHAT];
    } catch (error) {
      console.error("로컬 스토리지 데이터 파싱 오류:", error);
      return [DEFAULT_CHAT];
    }
  });

  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_CURRENT_CHAT_ID);
      // 이미 파싱된 chats 상태를 활용하여 중복 파싱 제거
      const isValidId = chats.some((chat: ChatSession) => chat.id === savedId);
      // chats가 비어있을 경우를 대비한 방어 코드 추가 (DEFAULT_CHAT.id로 폴백)
      return isValidId && savedId ? savedId : (chats.length > 0 ? chats[0].id : DEFAULT_CHAT.id);
    } catch (error) {
      return DEFAULT_CHAT.id;
    }
  });
  const [inputText, setInputText] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 현재 활성화된 채팅방 객체 찾기
  const currentChat = chats.find((c) => c.id === currentChatId) || chats[0];

  // 상태가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CURRENT_CHAT_ID, currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    const controller = new AbortController();

    // 백엔드 통신 테스트
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
    fetch(`${apiUrl.replace(/\/$/, "")}/api/health`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("서버 응답 에러");
        return res.json();
      })
      .then((data) => {
        setMessage(data.message);
        setStatus("success");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error(err);
        setMessage("백엔드 서버와 연결할 수 없습니다.");
        setStatus("error");
      });

    return () => controller.abort();
  }, []);

  // 메시지가 추가될 때마다 스크롤을 맨 아래로 부드럽게 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat.messages, isChatLoading]);

  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: "새로운 개념 학습",
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userText = inputText;
    const newUserMessage: Message = { role: "user", text: userText };

    // 현재 채팅방에 사용자 메시지 추가 (첫 메시지면 제목도 변경)
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? {
              ...chat,
              title:
                chat.messages.length === 0 ? userText.slice(0, 15) : chat.title,
              messages: [...chat.messages, newUserMessage],
            }
          : chat,
      ),
    );
    setInputText("");
    setIsChatLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
      const history = currentChat.messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history }),
      });

      if (!response.ok) throw new Error("채팅 요청 실패");

      const data = await response.json();
      const aiMessage: Message = { role: "model", text: data.reply };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, aiMessage] }
            : chat,
        ),
      );
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        role: "model",
        text: "앗, 뇌에 쥐가 났어! (통신 에러) 다시 한 번 말해줄래?",
      };
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, errorMessage] }
            : chat,
        ),
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  // 한글 입력 시 엔터키 중복 입력 방지(isComposing) 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      handleSendMessage();
    }
  };

  return (
    <div className="app-layout">
      {/* 왼쪽 사이드바 (Gemini 스타일) */}
      <aside className="sidebar">
        <button className="new-chat-btn" onClick={handleNewChat}>
          <span className="plus-icon">+</span> 새 대화
        </button>
        <div className="chat-list">
          <p className="list-title">최근 대화</p>
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-list-item ${chat.id === currentChatId ? "active" : ""}`}
              onClick={() => setCurrentChatId(chat.id)}
            >
              💬 {chat.title}
            </div>
          ))}
        </div>

        <div className="status-indicator">
          <span
            className={
              status === "success" ? "status-text-success" : "status-text-error"
            }
          >
            서버: {status === "success" ? "연결됨 🟢" : "연결 중... 🔴"}
          </span>
        </div>
      </aside>

      {/* 메인 채팅 영역 */}
      <main className="main-content">
        <div className="chat-header">
          <h2>AI 리버스 튜터링 솔루션 🎓</h2>
          <p>
            사용자가 선생님이 되어, 아무것도 모르는 AI에게 개념을 가르쳐주세요!
          </p>
        </div>

        <div className="chat-container">
          <div className="chat-history">
            {currentChat.messages.length === 0 && (
              <p className="empty-chat">
                아래 입력창을 통해 바보 학생에게 첫 인사를 건네보세요!
              </p>
            )}
            {currentChat.messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="message-bubble">
                  {/* 마크다운 렌더링 적용 */}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="chat-message model">
                <div className="message-bubble loading">생각 중... 🤔</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="개념을 설명해주세요..."
              disabled={isChatLoading || status !== "success"}
            />
            <button
              onClick={handleSendMessage}
              disabled={
                isChatLoading || !inputText.trim() || status !== "success"
              }
            >
              전송
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
