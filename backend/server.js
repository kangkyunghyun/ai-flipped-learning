import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 백엔드 폴더 내부의 .env를 먼저 찾고, 없으면 프로젝트 루트(상위) 폴더의 .env를 찾아 로드합니다.
dotenv.config();
dotenv.config({ path: "../.env" });

if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL 환경 변수가 설정되지 않았습니다.");
}

const app = express();
const PORT = process.env.PORT || 5001;

// Gemini API 초기화 (환경 변수에서 API 키 로드)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const aiModel = genAI.getGenerativeModel({
  model: "gemini-3.1-flash-lite-preview", // 현재 프리뷰(Preview) 상태인 정확한 모델명으로 수정
  systemInstruction:
    "너는 아무것도 모르는 백지상태의 학생이야. 사용자는 너에게 특정 개념을 가르쳐주는 선생님이야. 첫 인사로 '나는 암것도 모르는 바보야 우헤헤 나한테 개념을 설명해바'와 같이 말해. 사용자가 무언가를 설명하면 가끔 엉뚱한 오개념을 말하거나, 천진난만하게 꼬리 질문을 던져서 사용자가 더 깊이 고민하고 논리적으로 설명하도록 유도해야 해. 절대 먼저 정답을 말하거나 똑똑하게 행동하지 마.",
});

app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL // 실제 운영 환경의 프론트엔드 도메인
        : "http://localhost:5173", // 로컬 개발 환경의 프론트엔드 포트
  }),
);
app.use(express.json({ limit: "1mb" }));

// 테스트용 헬스체크 엔드포인트
app.get("/api/health", (req, res) => {
  res.json({ message: "백엔드 서버와 성공적으로 연결되었습니다! 🚀" });
});

// 백지상태 AI와의 채팅 엔드포인트
app.post("/api/chat", async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ message: "메시지가 비어 있습니다." });
    }

    // 이전 대화 기록을 포함하여 채팅 세션 시작
    const chatSession = aiModel.startChat({ history: history || [] });

    const result = await chatSession.sendMessage(message);
    const responseText = result.response.text();

    res.json({ reply: responseText });
  } catch (error) {
    next(error);
  }
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(err.stack || err);
  res.status(500).json({ message: "서버에서 오류가 발생했습니다." });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
