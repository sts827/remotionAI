# RemotionAI 🎬🤖

**RemotionAI**는 Google Gemini와 같은 생성형 AI를 활용하여 비디오 기획, 대본 작성, 음성 합성(TTS), 이미지 생성, 그리고 영상 렌더링까지 전 과정을 자동화하는 프로젝트입니다.  
**Remotion** 라이브러리를 기반으로 하며, AI가 생성한 자산을 React 컴포넌트로 시각화하여 동적인 영상을 만들어냅니다.

---

## ✨ 주요 기능 (Key Features)

### 1. 🤖 AI 기반 콘텐츠 생성
- **Script Generation**: 프롬프트 한 줄로 3~5개의 장면(Scene)으로 구성된 완벽한 시나리오를 작성합니다. (Gemini/Claude 연동)
- **TTS (Text-to-Speech)**: 각 장면에 어울리는 나레이션을 생성합니다. (Gemini TTS / ElevenLabs 지원)
- **Image Generation**: 시나리오 지문에 맞는 고화질 배경 이미지를 생성합니다. (Gemini / OpenAI DALL-E)

### 2. ⚡ 스마트 파이프라인 (Smart Pipeline)
- **Smart Caching**: 이미 생성된 자산(음성/이미지)이 있다면 재생성하지 않고 재사용하여 API 비용을 절감합니다.
- **Auto-Duration**: 생성된 오디오의 길이를 정밀하게 계산하여, 해당 장면의 영상 길이를 자동으로 동기화합니다.
- **Robust Error Handling**: 자산 파일이 누락되어도 프리뷰가 멈추지 않는 `SafeAudio`, `SafeAudioVisualizer` 시스템이 적용되어 있습니다.

### 3. 🎬 Remotion Studio 최적화
- **Timeline Labels**: 트랙 에디터에서 각 클립이 어떤 장면인지 식별하기 쉽도록 라벨링(Name Tag)이 적용되어 있습니다.
- **Visualizer**: 배경음악에 반응하는 오디오 비주얼라이저가 탑재되어 있습니다.
- **Ken Burns Effect**: 정지 이미지에 자연스러운 줌인/팬 효과를 부여하여 생동감을 줍니다.

---

## 🛠️ 개발 환경 (Development Environment)

이 프로젝트는 다음 환경에서 개발 및 테스트되었습니다.

- **OS**: Windows
- **Node.js**: v24.13.0
- **Package Manager**: npm
- **Framework**: Remotion v4.0

---

## 🚀 시작하기 (Getting Started)

### 1. 설치 (Installation)
프로젝트를 클론하고 의존성을 설치합니다.
```bash
npm install
```
(충돌 발생 시 `npm install --legacy-peer-deps` 사용 권장)

### 2. 환경 변수 설정 (.env)
`.env` 파일을 생성하고 다음 키를 설정해야 합니다.
```env
# AI Providers (gemini | claude | openai | mock)
TEXT_PROVIDER=gemini
TTS_PROVIDER=gemini
IMAGE_PROVIDER=gemini

# API Keys
GEMINI_API_KEY=your_key_here
```

### 3. 비디오 생성 (Generate)
CLI 명령어로 비디오 자산을 생성합니다.

**방법 A: 퀵 스타트 (프롬프트)**
```bash
npm run generate "비 오는 날의 조용한 카페 분위기"
```

**방법 B: 시나리오 모드 (JSON 파일)**
```bash
npm run generate -- --file=scenario.json --id=my-project
```

### 4. 미리보기 (Preview)
Remotion Studio를 실행하여 생성된 영상을 확인하고 편집합니다.
```bash
npm run dev
```
브라우저가 열리면 `http://localhost:3000`에서 확인할 수 있습니다.

---

## 📂 프로젝트 구조

- `scripts/generate-content.ts`: AI 생성 파이프라인의 핵심 로직 (Orchestrator)
- `src/AdvancedComposition.tsx`: 비디오 렌더링 메인 컴포넌트
- `src/services/ai/`: AI Provider (Gemini, Mock 등) 어댑터
- `public/assets/`: 생성된 미디어 자산이 저장되는 곳

---

## 📝 라이선스 (License)

이 프로젝트는 **MIT License**로 배포됩니다.

> **주의사항 (Note on Remotion License)**:
> 이 프로젝트는 [Remotion](https://www.remotion.dev/)을 기반으로 합니다.
> Remotion은 개인 및 소규모 기업(3인 이하, 영리 목적 포함)에게는 **무료(Free)**이나, 일정 규모 이상의 기업에게는 **Company License**가 필요할 수 있습니다.
> 자세한 내용은 [Remotion Licensing](https://www.remotion.dev/license) 페이지를 확인하시기 바랍니다.
