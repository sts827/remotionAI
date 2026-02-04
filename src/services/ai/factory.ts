/**
 * =============================================================================
 * AI Service Factory
 * =============================================================================
 *
 * Factory 패턴을 사용한 AI 서비스 Provider 관리
 * 환경변수(.env)에 따라 적절한 AI 서비스를 동적으로 주입
 *
 * ## 지원 Provider
 *
 * ### Text (스크립트 생성)
 * - gemini: Google Gemini 2.5 Pro (권장)
 * - claude: Anthropic Claude (구현 예정)
 * - mock: 테스트용 더미 데이터
 *
 * ### TTS (음성 합성)
 * - gemini: Google Gemini TTS
 * - elevenlabs: ElevenLabs (구현 예정)
 * - openai: OpenAI TTS (구현 예정)
 * - mock: 테스트용 더미 버퍼
 *
 * ### Image (이미지 생성)
 * - gemini: Google Gemini Imagen
 * - mock: 테스트용 더미 이미지
 *
 * ## 사용 예시
 * ```typescript
 * const textProvider = getTextProvider('gemini', process.env.GEMINI_API_KEY);
 * const content = await textProvider.generateContent("주제");
 * ```
 *
 * =============================================================================
 */

import { ITextGenerator, ITTSGenerator, IImageGenerator } from './types';
import { GeminiAdapter } from './adapters/gemini';
import { GeminiImageAdapter } from './adapters/gemini-image';
import { GeminiTTSAdapter } from './adapters/gemini-tts';
import { ClaudeAdapter } from './adapters/claude';
// import { MockAdapter } from './adapters/mock';

// ─────────────────────────────────────────────────────────────────────────────
// Text Generation Factory (LLM)
// ─────────────────────────────────────────────────────────────────────────────

export function getTextProvider(
    service: 'gemini' | 'claude' | 'mock' = 'gemini',
    apiKey: string = ''
): ITextGenerator {
    switch (service.toLowerCase()) {
        case 'gemini':
            return new GeminiAdapter(apiKey);
        case 'claude':
            return new ClaudeAdapter(apiKey);
        default:
            return new GeminiAdapter(apiKey);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS Generation Factory (Voice)
// ─────────────────────────────────────────────────────────────────────────────

export function getTTSProvider(
    service: 'elevenlabs' | 'openai' | 'gemini' = 'gemini',
    apiKey: string = ''
): ITTSGenerator {
    switch (service.toLowerCase()) {
        case 'gemini':
            return new GeminiTTSAdapter(apiKey);
        case 'elevenlabs':
        case 'openai':
            console.warn(`[Factory] ${service} adapter not implemented yet, falling back to Gemini`);
            return new GeminiTTSAdapter(apiKey);
        default:
            throw new Error(`Unsupported TTS provider: ${service}. Please check your .env configuration.`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Image Generation Factory
// ─────────────────────────────────────────────────────────────────────────────

export function getImageProvider(
    service: 'gemini' = 'gemini',
    apiKey: string = ''
): IImageGenerator {
    switch (service.toLowerCase()) {
        case 'gemini':
            return new GeminiImageAdapter(apiKey);
        default:
            throw new Error(`Unsupported Image provider: ${service}. Please check your .env configuration.`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy Support
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated getTextProvider 사용 권장 */
export const getAIProvider = getTextProvider;
