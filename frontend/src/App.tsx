import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    const controller = new AbortController();

    // 백엔드 통신 테스트
    fetch(
      (import.meta.env.VITE_API_URL || "http://localhost:5001") + "/api/health",
      { signal: controller.signal },
    )
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

  return (
    <div className="app-container">
      <h1>AI 리버스 튜터링 솔루션 🎓</h1>
      <p>"나는 암것도 모르는 바보야 우헤헤 나한테 설명해바"</p>
      <div className="status-box">
        <h3>서버 연결 상태</h3>
        <p
          className={
            status === "success"
              ? "status-text-success"
              : status === "error"
                ? "status-text-error"
                : ""
          }
        >
          {message || "연결 중..."}
        </p>
      </div>
    </div>
  );
}

export default App;
