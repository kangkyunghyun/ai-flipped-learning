import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL // 실제 운영 환경의 프론트엔드 도메인
        : "http://localhost:5173", // 로컬 개발 환경의 프론트엔드 포트
  }),
);
app.use(express.json());

// 테스트용 헬스체크 엔드포인트
app.get("/api/health", (req, res) => {
  res.json({ message: "백엔드 서버와 성공적으로 연결되었습니다! 🚀" });
});

// TODO: "백지상태 AI"와의 대화를 처리할 LLM 연동 엔드포인트 추가 예정

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "서버에서 오류가 발생했습니다." });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
