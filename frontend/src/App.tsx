import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

type Message = {
  role: "user" | "model";
  text: string;
};

type Persona = "naive" | "average" | "genius";

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  persona?: Persona;
};

const STORAGE_KEY_CHATS = "ai_tutor_chats";
const STORAGE_KEY_THEME = "ai_tutor_theme";

function App() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as 'light' | 'dark' | null;
    if (savedTheme) {
      return savedTheme;
    }
    // 사용자의 시스템 테마 설정을 기본값으로 사용
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });


  // 여러 개의 채팅 세션을 관리 (로컬 스토리지 연동)
  const [chats, setChats] = useState<ChatSession[]>(() => {
    try {
      const savedChats = localStorage.getItem(STORAGE_KEY_CHATS);
      if (savedChats) {
        const parsed = JSON.parse(savedChats);
        // 배열이면서 최소 1개 이상의 데이터가 있는지 확인 (방어 코드)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 데이터 구조 검증: 필수 필드(id, messages) 존재 여부 확인
          const isValid = parsed.every(
            (chat: any) => chat?.id && Array.isArray(chat?.messages)
          );
          if (isValid) {
            // 내용이 없는 빈 채팅방은 스토리지에서 자동 제거
            return parsed.filter((c: ChatSession) => c.messages.length > 0);
          }
        }
      }
      return [];
    } catch (error) {
      console.error("로컬 스토리지 데이터 파싱 오류:", error);
      return [];
    }
  });

  // 항상 초기 화면은 "새 대화" 상태로 시작
  const [currentChatId, setCurrentChatId] = useState<string>("new");
  const [newChatPersona, setNewChatPersona] = useState<Persona>("naive");

  const [inputText, setInputText] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 현재 활성화된 채팅방 객체 찾기
  const currentChat: ChatSession = useMemo(() => {
    if (currentChatId === "new") {
      return { id: "new", title: "새로운 개념 학습", messages: [], persona: newChatPersona };
    }
    return chats.find((c) => c.id === currentChatId) || { id: "new", title: "새로운 개념 학습", messages: [], persona: newChatPersona };
  }, [currentChatId, newChatPersona, chats]);

  // 상태가 변경될 때마다 로컬 스토리지에 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
    } catch (error) {
      console.error("로컬 스토리지 채팅 데이터 저장 실패 (용량 초과 등):", error);
      alert("저장 공간이 부족하여 대화 기록을 저장하지 못했습니다. 불필요한 데이터를 지워주세요.");
    }
  }, [chats]);

  // 테마가 변경될 때마다 <html>에 data-theme 속성을 적용하고 로컬 스토리지에 저장
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch (error) {
      console.error("테마 저장 실패:", error);
    }
  }, [theme]);

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
    // 빈 방을 생성하지 않고 상태만 "새 대화"로 전환
    setCurrentChatId("new");
    setNewChatPersona("naive");
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userText = inputText;
    const newUserMessage: Message = { role: "user", text: userText };

    let targetChatId = currentChatId;
    let targetPersona = currentChat.persona || "naive";

    if (currentChatId === "new") {
      // 첫 메시지 전송 시 실제 채팅방 생성 (Lazy Creation)
      targetChatId = Date.now().toString();
      const newChat: ChatSession = {
        id: targetChatId,
        title: userText.slice(0, 15),
        messages: [newUserMessage],
        persona: targetPersona,
      };
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(targetChatId);
    } else {
      // 기존 채팅방에 사용자 메시지 추가
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, newUserMessage] }
            : chat,
        ),
      );
    }

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
        body: JSON.stringify({ 
          message: userText, 
          history,
          persona: targetPersona
        }),
      });

      if (!response.ok) throw new Error("채팅 요청 실패");

      const data = await response.json();
      const aiMessage: Message = { role: "model", text: data.reply };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === targetChatId
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
          chat.id === targetChatId
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

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("정말 이 대화를 삭제하시겠습니까?")) return;

    const updated = chats.filter((c) => c.id !== id);
    setChats(updated);
    if (currentChatId === id) {
      setCurrentChatId("new");
    }
  };

  const handleStartEdit = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditingTitle(title);
  };

  const handleSaveEdit = (e: React.KeyboardEvent | React.FocusEvent, id: string) => {
    e.stopPropagation();
    if (e.type === "keydown") {
      const key = (e as React.KeyboardEvent).key;
      if (key === "Escape") {
        setEditingChatId(null);
        return;
      }
      if (key !== "Enter") return;
    }

    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle) {
      setChats((prev) =>
        prev.map((chat) => (chat.id === id && chat.title !== trimmedTitle ? { ...chat, title: trimmedTitle } : chat))
      );
    }
    setEditingChatId(null);
  };

  const updatePersona = (persona: Persona) => {
    if (currentChatId === "new") {
      setNewChatPersona(persona);
    } else {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId ? { ...chat, persona } : chat
        )
      );
    }
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
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
              <div className="chat-title-container">
                <span>💬</span>
                {editingChatId === chat.id ? (
                  <input
                    type="text"
                    className="chat-edit-input"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => handleSaveEdit(e, chat.id)}
                    onBlur={(e) => handleSaveEdit(e, chat.id)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="chat-title-text">{chat.title}</span>
                )}
              </div>
              <div className="chat-actions">
                <button
                  className="action-btn edit-btn"
                  onClick={(e) => handleStartEdit(e, chat.id, chat.title)}
                  title="이름 변경"
                >
                  ✏️
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={(e) => handleDeleteChat(e, chat.id)}
                  title="삭제"
                >
                  🗑️
                </button>
              </div>
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
          <div className="header-content">
            <h2>Reverse Tutoring.</h2>
            <p>
              당신이 선생님이 되어, 백지상태의 AI를 완벽하게 이해시켜 보세요.
            </p>
          </div>
          <button onClick={toggleTheme} className="theme-toggle-btn" title="테마 변경">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        <div className="chat-container">
          <div className="chat-history">
            {currentChat.messages.length === 0 && (
              <div className="empty-chat">
                <p>
                  아래에서 학생의 성향을 선택하고 첫 인사를 건네보세요!
                </p>
                <div className="persona-buttons">
                  {(["naive", "average", "genius"] as const).map((p) => {
                    const isActive = (currentChat.persona || "naive") === p;
                    const labels: Record<Persona, string> = {
                      naive: "순진한 바보",
                      average: "평범한 학습자",
                      genius: "날카로운 천재",
                    };
                    return ( <button key={p} className={`persona-btn ${isActive ? "active" : ""}`} onClick={() => updatePersona(p)} >
                        {labels[p]}
                      </button>
                    );
                  })}
                </div>
                <p className="persona-description">
                  {{
                    naive: "엉뚱한 오개념과 질문으로 메타인지를 돕습니다.",
                    average: "적당한 이해력을 바탕으로 논리적인 꼬리 질문을 던집니다.",
                    genius: "논리적 비약을 찾아내고 예리한 질문으로 지적 토론을 주도합니다.",
                  }[currentChat.persona || "naive"]}
                </p>
              </div>
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

          <div className="input-wrapper">
            <div className="chat-input-area">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="선생님, 오늘 배울 개념은 무엇인가요?"
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
        </div>
      </main>
    </div>
  );
}

export default App;
