import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { systemInstructions, evaluatorInstruction } from "./prompts.js";

// 백엔드 폴더 내부의 .env를 먼저 찾고, 없으면 프로젝트 루트(상위) 폴더의 .env를 찾아 로드합니다.
dotenv.config();
dotenv.config({ path: "../.env" });

if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL 환경 변수가 설정되지 않았습니다.");
}

const app = express();
const PORT = process.env.PORT || 5001;

// Gemini API 초기화 (환경 변수에서 API 키 로드)
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
}
const genAI = new GoogleGenerativeAI(geminiApiKey);

// 요청받은 페르소나에 맞춰 모델을 동적으로 생성하는 함수
const getModel = (persona) => {
  const systemInstruction = ["naive", "average", "genius"].includes(persona)
    ? systemInstructions[persona]
    : systemInstructions.naive;

  return genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    systemInstruction,
  });
};

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
    const { message, history, persona } = req.body;

    if (!message) {
      return res.status(400).json({ message: "메시지가 비어 있습니다." });
    }

    const aiModel = getModel(persona);

    // 이전 대화 기록을 포함하여 채팅 세션 시작
    const chatSession = aiModel.startChat({ history: history || [] });

    const result = await chatSession.sendMessageStream(message);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of result.stream) {
      res.write(chunk.text());
    }
    res.end();
  } catch (error) {
    next(error);
  }
});

// 학습 평가 엔드포인트
app.post("/api/evaluate", async (req, res, next) => {
  try {
    const { history } = req.body;

    if (!history || history.length === 0) {
      return res.status(400).json({ message: "평가할 대화 내역이 없습니다." });
    }

    const aiModel = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview",
      systemInstruction: evaluatorInstruction,
    });

    // 평가 시에는 history 배열을 하나의 텍스트 대화록으로 묶어서 프롬프트에 주입
    const conversation = history.map(m => `${m.role === 'user' ? '선생님(사용자)' : '학생(AI)'}: ${m.parts?.[0]?.text || ''}`).join('\n\n');
    const prompt = `다음은 선생님(사용자)과 학생(AI)의 대화 내역이야. 이를 바탕으로 선생님의 가르침을 객관적으로 평가해줘.\n\n[대화 내역]\n${conversation}`;

    const result = await aiModel.generateContentStream(prompt);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of result.stream) {
      res.write(chunk.text());
    }
    res.end();
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
