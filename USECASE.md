# RemotionAI System Manual & Usecase Analysis

이 문서는 **RemotionAI 비디오 생성 시스템**의 작동 원리, 사용법, 그리고 예상 결과물을 종합적으로 설명하는 기술 문서입니다.
현재 코드베이스(`scripts/generate-content.ts`, `src/services/ai/*`)의 분석을 토대로 작성되었습니다.

---

## 1. 🏗️ 시스템 아키텍처 (System Architecture)

이 시스템은 **"AI가 기획하고, Remotion이 렌더링하는"** 구조로 설계되었습니다.

```text
    User (Prompt/JSON)
           |
           v
  [ CLI: generate-content.ts ]
           |
           +---> 1. Text Provider (Gemini/Claude)
           |          |
           |          v
           |     (Script/Scenario)
           |
           +---> 2. Scene Processor (Loop)
                      |
        +-------------+-------------+
        |                           |
        v                           v
 [ TTS Provider ]           [ Image Provider ]
        |                           |
        v                           v
  (voice-N.mp3)               (scene-N.png)
        |                           |
        +-------------+-------------+
                      |
                      v
            [ Public Assets Folder ] <----+
                      +                   |
           [ advanced-content.json ]      |
                      |                   |
                      v                   |
           [ Remotion Preview (Web) ] ----+
```

### 핵심 모듈
1.  **Orchestrator (`generate-content.ts`)**: 전체 파이프라인을 조율하는 지휘자 역할을 합니다. 사용자 입력을 파싱하고, AI 서비스를 호출하며, 결과물을 파일로 저장합니다.
2.  **AI Factory (`src/services/ai/factory.ts`)**: `.env` 설정에 따라 Gemini, Claude, Mock 등 적절한 AI 서비스를 동적으로 주입합니다.
3.  **Smart Caching Layer**: 파일 시스템을 확인하여 이미 존재하는 자산은 **재생성하지 않고 넘어가** 비용을 절감합니다.

---

## 2. 📖 사용 설명서 (User Manual)

### 모드 1: 퀵 스타트 (Simple Prompt)
가장 빠르게 아이디어를 시각화하고 싶을 때 사용합니다.
- **명령어**: `npm run generate "비 오는 날의 조용한 카페"`
- **동작**: AI가 스스로 3~5개의 장면을 상상하여 스크립트와 이미지를 모두 생성합니다.

### 모드 2: 시나리오 모드 (Structured Scenario) ⭐ 추천
ChatGPT나 Claude를 이용해 정교한 연출을 하고 싶을 때 사용합니다.
1. `PROMPT_TEMPLATE.md`의 프롬프트를 사용하여 JSON 시나리오를 얻습니다.
2. `scenario.json` 파일로 저장합니다.
3. **명령어**: `npm run generate -- --file=scenario.json --id=my-project`
- **동작**: 사용자가 지정한 대사(Script)와 지문(Image Prompt)을 정확하게 수행합니다.

### 모드 3: 수정 및 재생성 (Refine Workflow) ⭐ 핵심 기능
결과물이 마음에 들지 않을 때 **부분 수정**을 하는 방법입니다.
1. `public/assets/my-project/` 폴더로 이동합니다.
2. 마음에 들지 않는 파일(예: `scene-2.png` 또는 `voice-3.mp3`)을 **삭제**합니다.
3. 명령어를 **다시 실행**합니다.
- **동작**: 시스템은 **"삭제된 파일만"** 감지하여 새로 생성(AI 호출)하고, 나머지는 기존 파일을 그대로 씁니다.

---

## 3. 📂 예상 출력 결과물 (Expected Outputs)

작업이 완료되면 다음과 같은 파일들이 생성됩니다.

### 1. 프로젝트 폴더 (`public/assets/{project-id}/`)
실제 비디오에 사용되는 원본 소스들입니다.
- `voice-1.mp3`, `voice-2.mp3`: 각 장면의 나레이션 음성 파일.
- `scene-1.png`, `scene-2.png`: 각 장면의 배경 이미지 (1920x1080 권장).
- `voiceover.mp3`: (레거시) 전체 통합 오디오 파일.

### 2. 타임라인 데이터 (`src/resources/advanced-content.json`)
Remotion이 비디오를 그리기 위한 설계도입니다.
```json
{
    "tracks": [
        {
            "id": "voice-1",
            "type": "audio",
            "src": "assets/project-001/voice-1.mp3",
            "startFrame": 0
        },
        {
            "id": "scene-1-bg",
            "type": "image",
            "animation": { "type": "ken-burns" }
        }
    ]
}
```

---

## 4. ✅ 기능 검증 체크리스트 (Feature Checklist)

오늘 구현된 핵심 기능들의 정상 작동 여부를 확인하는 표입니다.

| 카테고리 | 검증 항목 (Test Case) | 기대 결과 (Expected Behavior) | 상태 |
| :--- | :--- | :--- | :--- |
| **Input** | JSON 파일 입력 (`--file`) | `PROMPT_TEMPLATE` 형식의 JSON을 읽어 장면(Scene)을 인식한다. | ✅ |
| **Logic** | Scene 루프 처리 | 설정된 장면 수만큼 TTS와 이미지를 개별적으로 생성한다. | ✅ |
| **AI** | 모델 연동 (Gemini) | 텍스트, 음성, 이미지가 유효한 파일로 저장된다. | ✅ |
| **Sync** | **자동 길이 조절 (Auto-Duration)** | 오디오 파일 길이를 측정하여, 영상(이미지/자막) 길이를 자동으로 늘린다. | ✅ |
| **Cache** | **스마트 캐싱 (Skip-if-exists)** | 기존 파일이 있으면 AI 호출을 건너뛰고 "Skipping..." 로그를 띄운다. | ✅ |
| **UI** | Ken Burns 효과 | 정지 이미지가 서서히 줌인/팬 되며 동적인 느낌을 준다. | ✅ |
| **Output** | Remotion Preview | `http://localhost:3000`에서 싱크가 맞는 영상이 재생된다. | ✅ |

---

## 5. 결론 및 향후 과제

현재 시스템은 **"비용 효율적이고 수정 가능한"** AI 비디오 파이프라인의 기초를 완벽하게 갖추었습니다.
- **비용**: 캐싱 전략으로 불필요한 과금 차단.
- **품질**: Scene별 개별 제어로 싱크 정확도 확보.
- **확장성**: JSON 기반으로 외부 툴(에이전트)과 연동 용이.

**다음 단계 제안:**
- [ ] 자막 애니메이션 스타일 다양화
- [ ] 배경 음악 자동 선정 (Mood 기반)
- [ ] 트랜지션 효과 고도화 (Wipe, Slide 등)
