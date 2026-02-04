/**
 * =============================================================================
 * AI Service Type Definitions
 * =============================================================================
 * RemotionAI 시스템에서 사용되는 AI 서비스 인터페이스 정의
 * - Text Generation: 스크립트 및 이미지 프롬프트 생성
 * - TTS Generation: 텍스트를 음성으로 변환
 * - Image Generation: 프롬프트 기반 이미지 생성
 * =============================================================================
 */

/**
 * 단일 Scene의 AI 생성 결과
 * - script: 해당 Scene의 나레이션 텍스트
 * - imagePrompt: 이미지 생성을 위한 상세 프롬프트
 * - keywords: 관련 키워드 (검색/태깅용)
 */
export interface AIContent {
    script: string;
    imagePrompt: string;
    keywords: string[];
}

/**
 * 다중 Scene 생성 결과 (모드 1: Simple Prompt용)
 * USECASE.md 요구사항: AI가 3~5개의 장면을 자동 생성
 */
export interface AISceneContent {
    scene_id: number;           // Scene 순번 (1부터 시작)
    script: string;             // 나레이션 텍스트
    image_prompt: string;       // 이미지 생성 프롬프트
    duration?: number;          // 권장 재생 시간 (초), 실제는 오디오 길이로 재계산됨
}

/**
 * AI 콘텐츠 생성 옵션
 */
export interface GenerateOptions {
    language?: string;          // 생성 언어 (e.g. 'ko', 'en', 'ja')
    sceneCount?: number;        // 생성할 Scene 수 (모드 1용, 기본값: 3~5)
}

/**
 * Text Generation Interface (Script, Prompts)
 *
 * 두 가지 생성 모드 지원:
 * 1. generateContent(): 단일 Scene 생성 (레거시 호환)
 * 2. generateScenes(): 다중 Scene 생성 (모드 1: Simple Prompt)
 */
export interface ITextGenerator {
    /** 단일 Scene 생성 (레거시 호환) */
    generateContent(prompt: string, options?: GenerateOptions): Promise<AIContent>;

    /**
     * 다중 Scene 자동 생성 (모드 1: Simple Prompt)
     * @param prompt - 비디오 주제/아이디어 (예: "비 오는 날의 조용한 카페")
     * @param options - 생성 옵션 (언어, Scene 수 등)
     * @returns 3~5개의 Scene 배열
     */
    generateScenes?(prompt: string, options?: GenerateOptions): Promise<AISceneContent[]>;
}

/**
 * TTS Generation Interface (Audio)
 *
 * 텍스트를 음성으로 변환하는 서비스 인터페이스
 * - Gemini TTS, ElevenLabs 등 다양한 제공자 지원
 * - 단어별 타이밍 정보 반환 가능 (자막 싱크용)
 */
export interface ITTSGenerator {
    /**
     * 텍스트를 음성으로 변환
     * @param text - 변환할 텍스트
     * @param voiceId - 음성 ID (제공자별 상이)
     * @param options - 생성 옵션
     * @returns audio: 오디오 버퍼, wordTimings: 단어별 타이밍 (선택)
     */
    generateSpeech(text: string, voiceId?: string, options?: GenerateOptions): Promise<{
        audio: ArrayBuffer;
        wordTimings?: Array<{ word: string, start: number, end: number }>;
    }>;
}

/**
 * Image Generation Interface
 *
 * 텍스트 프롬프트로 이미지를 생성하는 서비스 인터페이스
 * - Gemini Imagen, DALL-E, Midjourney 등 지원 가능
 * - 권장 해상도: 1920x1080 (16:9) 또는 1080x1920 (9:16)
 */
export interface IImageGenerator {
    /**
     * 프롬프트 기반 이미지 생성
     * @param prompt - 이미지 설명 프롬프트
     * @param style - 스타일 힌트 (선택)
     * @returns ArrayBuffer (PNG/JPEG 형식)
     */
    generateImage(prompt: string, style?: string): Promise<ArrayBuffer>;
}

/**
 * Unified AI Client (Optional)
 * 모든 AI 서비스를 하나의 클라이언트로 통합 접근
 */
export interface IAIClient {
    text: ITextGenerator;
    tts: ITTSGenerator;
    image: IImageGenerator;
}
