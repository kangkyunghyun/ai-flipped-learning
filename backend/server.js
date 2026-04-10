import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// 테스트용 헬스체크 엔드포인트
app.get("/api/health", (req, res) => {
  res.json({ message: "백엔드 서버와 성공적으로 연결되었습니다! 🚀" });
});

// TODO: "백지상태 AI"와의 대화를 처리할 LLM 연동 엔드포인트 추가 예정

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
