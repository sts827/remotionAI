/**
 * =============================================================================
 * Gemini Text Generation Adapter
 * =============================================================================
 * Google Gemini API를 사용한 텍스트/스크립트 생성 어댑터
 *
 * 지원 기능:
 * - generateContent(): 단일 Scene 생성 (레거시 호환)
 * - generateScenes(): 다중 Scene 자동 생성 (모드 1: Simple Prompt)
 *
 * 사용 모델: gemini-2.5-pro (환경변수로 변경 가능)
 * =============================================================================
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { ITextGenerator, AIContent, AISceneContent, GenerateOptions } from "../types";

export class GeminiAdapter implements ITextGenerator {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private scenesModel: any;  // 다중 Scene 생성용 모델

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("Gemini API Key is required");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);

        // 환경변수에서 모델명 로드, 기본값: gemini-2.5-pro
        const modelName = process.env.GEMINI_MODEL || "gemini-2.5-pro";
        console.log(`[Gemini] Using model: ${modelName}`);

        // ─────────────────────────────────────────────────────────────────────
        // 단일 Scene 생성용 모델 (레거시 호환)
        // ─────────────────────────────────────────────────────────────────────
        this.model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        script: {
                            type: SchemaType.STRING,
                            description: "The narration script for the video."
                        },
                        imagePrompt: {
                            type: SchemaType.STRING,
                            description: "A detailed prompt for generating an image representing the video topic."
                        },
                        keywords: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                            description: "5 relevant keywords for the video."
                        }
                    },
                    required: ["script", "imagePrompt", "keywords"]
                }
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // 다중 Scene 생성용 모델 (모드 1: Simple Prompt)
        // USECASE.md 요구사항: AI가 3~5개의 장면을 자동 생성
        // ─────────────────────────────────────────────────────────────────────
        this.scenesModel = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            scene_id: {
                                type: SchemaType.NUMBER,
                                description: "Scene number starting from 1"
                            },
                            script: {
                                type: SchemaType.STRING,
                                description: "Narration script for this scene (1-3 sentences)"
                            },
                            image_prompt: {
                                type: SchemaType.STRING,
                                description: "Detailed image generation prompt describing the visual scene"
                            },
                            duration: {
                                type: SchemaType.NUMBER,
                                description: "Recommended duration in seconds (3-8 seconds)"
                            }
                        },
                        required: ["scene_id", "script", "image_prompt"]
                    }
                }
            }
        });
    }

    /**
     * 단일 Scene 콘텐츠 생성 (레거시 호환)
     * @param prompt - 비디오 주제
     * @returns 단일 AIContent 객체
     */
    async generateContent(prompt: string): Promise<AIContent> {
        console.log(`[Gemini] Generating single content for: "${prompt.substring(0, 50)}..."`);

        try {
            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();

            // responseMimeType: "application/json" 설정으로 JSON 파싱 가능
            const data = JSON.parse(responseText);

            return {
                script: data.script,
                imagePrompt: data.imagePrompt,
                keywords: data.keywords || []
            };
        } catch (error) {
            console.error("[Gemini] Single content generation failed:", error);
            throw new Error("Failed to generate content from Gemini");
        }
    }

    /**
     * 다중 Scene 자동 생성 (모드 1: Simple Prompt)
     *
     * USECASE.md 요구사항:
     * "AI가 스스로 3~5개의 장면을 상상하여 스크립트와 이미지를 모두 생성합니다."
     *
     * @param prompt - 비디오 주제/아이디어 (예: "비 오는 날의 조용한 카페")
     * @param options - 생성 옵션 (sceneCount: 생성할 Scene 수, 기본 3~5)
     * @returns AISceneContent[] - Scene 배열
     */
    async generateScenes(prompt: string, options?: GenerateOptions): Promise<AISceneContent[]> {
        const sceneCount = options?.sceneCount || 4;  // 기본 4개 Scene (3~5 범위 중간값)
        const language = options?.language || 'ko';   // 기본 한국어

        console.log(`[Gemini] Generating ${sceneCount} scenes for: "${prompt.substring(0, 50)}..."`);

        // ─────────────────────────────────────────────────────────────────────
        // 다중 Scene 생성을 위한 시스템 프롬프트
        // 각 Scene이 자연스럽게 연결되도록 지시
        // ─────────────────────────────────────────────────────────────────────
        const systemPrompt = `
You are a professional video script writer. Create exactly ${sceneCount} scenes for a short-form video.

Topic: "${prompt}"

Requirements:
- Language: ${language === 'ko' ? 'Korean' : 'English'}
- Each scene should flow naturally into the next
- Scripts should be 1-3 sentences, suitable for narration (15-30 words each)
- Image prompts should be highly detailed, cinematic descriptions
- Include visual mood, lighting, camera angle in image prompts
- Duration should be 3-8 seconds per scene
- Total video should tell a cohesive story or explanation

Output ${sceneCount} scenes with scene_id (1 to ${sceneCount}), script, image_prompt, and duration.
`.trim();

        try {
            const result = await this.scenesModel.generateContent(systemPrompt);
            const responseText = result.response.text();
            const scenes: AISceneContent[] = JSON.parse(responseText);

            // 유효성 검증: 최소 1개 이상의 Scene이 있어야 함
            if (!Array.isArray(scenes) || scenes.length === 0) {
                throw new Error("Invalid response: No scenes generated");
            }

            console.log(`[Gemini] Successfully generated ${scenes.length} scenes`);

            // Scene ID 재정렬 (1부터 순차적으로)
            return scenes.map((scene, index) => ({
                scene_id: index + 1,
                script: scene.script,
                image_prompt: scene.image_prompt,
                duration: scene.duration || 5  // 기본 5초
            }));

        } catch (error) {
            console.error("[Gemini] Multi-scene generation failed:", error);

            // 실패 시 단일 Scene으로 폴백 (graceful degradation)
            console.log("[Gemini] Falling back to single scene generation...");
            const fallback = await this.generateContent(prompt);

            return [{
                scene_id: 1,
                script: fallback.script,
                image_prompt: fallback.imagePrompt,
                duration: 5
            }];
        }
    }
}
