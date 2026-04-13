# 🎓 Reverse Tutoring (리버스 튜터링)

> "당신이 선생님이 되어, 백지상태의 AI를 완벽하게 이해시켜 보세요."

**Reverse Tutoring**은 사용자가 선생님이 되고 AI가 학생이 되는 역발상(Flipped Learning) 학습 플랫폼입니다. 무언가를 남에게 가르칠 때 메타인지가 활성화되고 학습 효과가 극대화된다는 점에 착안하여 개발되었습니다.

🔗 **정식 서비스 바로가기**: https://reverse-tutoring.vercel.app/

---

## ✨ 주요 기능

- **🧑‍🎓 3가지 학생 페르소나**:
  - **순진한 바보 (Naive)**: 엉뚱한 질문과 오개념으로 기초부터 탄탄하게 설명하도록 유도합니다.
  - **평범한 학습자 (Average)**: 적당한 이해력과 논리적인 꼬리 질문으로 깊은 사고를 돕습니다.
  - **날카로운 천재 (Genius)**: 논리적 비약을 찾아내고 예리한 질문으로 지적 토론을 주도합니다.
- **📝 마크다운 & 수식(LaTeX) 렌더링**: 수학 기호 및 복잡한 수식, 코드 블록을 깔끔하게 렌더링하여 이과 과목 설명에도 최적화되어 있습니다.
- **📊 교육 전문가의 피드백 (평가)**: 대화가 끝나면 AI가 '교육 전문가'로 변신하여 사용자의 설명 능력을 점수와 함께 꼼꼼하게 평가해 줍니다.
- **📱 완벽한 반응형 UI (Mobile-first)**: 데스크톱은 물론 모바일 환경에서도 최적화된 하이엔드 Soft UI와 햄버거 슬라이드 메뉴를 제공합니다.
- **🌙 다크/라이트 테마 & 로컬 스토리지**: 시스템 테마 연동 및 눈이 편안한 테마 전환을 지원하며, 모든 대화 내역은 브라우저에 안전하게 저장됩니다.

<br/>

## 🛠 기술 스택

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **CSS** (High-motion Soft UI, CSS Variables 기반 다크모드 대응)
- `react-markdown`, `remark-math`, `rehype-katex` (마크다운 및 수식 렌더링)

### Backend
- **Node.js** + **Express.js**
- `@google/generative-ai` (**Gemini 3.1 Flash Lite Preview** API)

<br/>

## 🚀 시작하기

이 프로젝트는 NPM Workspace를 활용한 **Monorepo** 구조로 되어 있습니다. 프론트엔드와 백엔드를 한 번에 쉽게 설치하고 실행할 수 있습니다.

### 1. 사전 준비
- Node.js (v18 이상 권장)
- Google AI Studio에서 발급받은 **Gemini API Key**

### 2. 프로젝트 클론 및 패키지 설치
```bash
git clone https://github.com/Reverse-Tutoring/reverse-tutoring.git
cd reverse-tutoring

# 워크스페이스(Monorepo) 내의 모든 의존성 한 번에 설치
npm install
```

### 3. 환경 변수 설정
프로젝트 루트(최상단) 디렉토리에 `.env` 파일을 생성하고 아래 내용을 입력합니다.

```env
# 백엔드 서버 포트 (기본값: 5001)
PORT=5001
GEMINI_API_KEY=당신의_제미나이_API_키
NODE_ENV=development

# 프론트엔드가 백엔드 API를 호출할 주소 (선택 사항)
VITE_API_URL=http://localhost:5001
```

### 4. 서버 실행
프로젝트 루트 디렉토리에서 아래 명령어를 통해 프론트엔드와 백엔드를 각각 실행할 수 있습니다.

```bash
# 터미널 1: 프론트엔드 실행 (http://localhost:5173)
npm run dev:frontend

# 터미널 2: 백엔드 실행 (http://localhost:5001)
npm run dev:backend
```

<br/>

## 📄 라이선스
This project is licensed under the MIT License.
