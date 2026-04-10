import React, { useState, useEffect } from "react";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // 백엔드 통신 테스트
    fetch(
      (import.meta.env.VITE_API_URL || "http://localhost:5001") + "/api/health",
    )
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => {
        console.error(err);
        setMessage("백엔드 서버와 연결할 수 없습니다.");
      });
  }, []);

  return (
    <div
      style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center" }}
    >
      <h1>AI 리버스 튜터링 솔루션 🎓</h1>
      <p>"나는 암것도 모르는 바보야 우헤헤 나한테 설명해바"</p>
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h3>서버 연결 상태</h3>
        <p
          style={{
            color: message.includes("성공적") ? "green" : "red",
            fontWeight: "bold",
          }}
        >
          {message || "연결 중..."}
        </p>
      </div>
    </div>
  );
}

export default App;
