/**
 * =============================================================================
 * RemotionAI Content Generation Pipeline
 * =============================================================================
 *
 * 이 스크립트는 AI를 사용하여 비디오 콘텐츠를 자동 생성하는 파이프라인입니다.
 *
 * ## 지원 모드 (USECASE.md 참조)
 *
 * ### 모드 1: Quick Start (Simple Prompt)
 * - 명령어: npm run generate "비 오는 날의 조용한 카페"
 * - 동작: AI가 3~5개의 Scene을 자동 생성
 *
 * ### 모드 2: Scenario Mode (Structured JSON)
 * - 명령어: npm run generate -- --file=scenario.json --id=my-project
 * - 동작: 사용자가 지정한 JSON 시나리오대로 생성
 *
 * ### 모드 3: Refine Workflow (Smart Caching)
 * - 동작: 삭제된 파일만 재생성, 나머지는 캐시 사용
 *
 * ## 출력 결과
 * - public/assets/{project-id}/voice-N.mp3  : TTS 음성 파일
 * - public/assets/{project-id}/scene-N.png  : 배경 이미지
 * - src/resources/advanced-content.json     : Remotion 타임라인 데이터
 *
 * =============================================================================
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { getAudioDurationInSeconds } from 'get-audio-duration';
// Import factory after dotenv setup to ensure process.env is populated
import { getTextProvider, getTTSProvider, getImageProvider } from '../src/services/ai/factory';

// Load .env first (defaults)
dotenv.config();

// Load .env.local if it exists (overrides .env)
const localEnvPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: localEnvPath, override: true });


// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agent/CLI 출력 인터페이스
 * JSON 모드(--json)에서 사용되는 구조화된 응답
 */
interface AgentOutput {
    status: 'success' | 'error';
    projectId?: string;
    projectPath?: string;
    projectJsonPath?: string;  // 프로젝트별 JSON 파일 경로
    previewUrl?: string;       // 예: http://localhost:3000
    assets?: string[];
    error?: string;
}

/**
 * Remotion advanced-content.json 스키마
 * Remotion이 비디오를 렌더링하기 위한 설계도
 */
interface AdvancedContent {
    title: string;
    width: number;
    height: number;
    fps: number;
    backgroundMusic: {
        src: string;
        volume: number;
        loop: boolean;
    };
    tracks: any[];  // 동적으로 구성되는 Track 배열
}

/**
 * 오디오 포맷 상수
 * Gemini TTS 응답 형식에 따라 조정 필요
 */
const AUDIO_FORMAT = {
    // PCM 24kHz, Mono, 16-bit = 48000 bytes/sec
    // 실제 Gemini TTS가 MP3를 반환하는 경우 이 값은 정확하지 않음
    // TODO: 실제 오디오 파일 헤더를 파싱하여 정확한 duration 계산
    BYTES_PER_SECOND: 48000,
    PADDING_SECONDS: 0.5,  // 음성 후 여유 시간
    FALLBACK_DURATION: 5   // 계산 실패 시 기본값 (초)
};

/**
 * 비디오 기본 설정
 * USECASE.md와 일치하도록 세로 영상(9:16) 기준
 */
const VIDEO_CONFIG = {
    WIDTH: 1080,
    HEIGHT: 1920,
    FPS: 30
};

/**
 * 입력 파일 경로 설정
 * 모드 2 (Scenario Mode)에서 JSON 파일을 읽을 기본 디렉토리
 */
const INPUT_PATHS = {
    // 시나리오 JSON 파일 기본 저장 위치
    SCENARIOS_DIR: path.join(__dirname, '../scenarios'),
    // 대체 경로: public/scenarios (웹 접근 가능)
    PUBLIC_SCENARIOS_DIR: path.join(__dirname, '../public/scenarios')
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 오디오 파일에서 실제 재생 시간을 계산
 * get-audio-duration 라이브러리를 사용하여 정확한 길이 측정
 *
 * @param audioInput - 오디오 파일 경로 (string) 또는 버퍼 (Buffer)
 * @returns 재생 시간 (초)
 */
async function calculateAudioDuration(audioInput: string | Buffer): Promise<number> {
    try {
        let duration: number;

        if (typeof audioInput === 'string') {
            // 파일 경로인 경우
            duration = await getAudioDurationInSeconds(audioInput);
        } else {
            // 버퍼인 경우 (Stream으로 변환 필요하지만, 제약사항으로 인해 임시파일 권장)
            // 여기서는 이미 파일로 저장된 경로를 넘기는 구조로 변경하는 것이 효율적임
            // Fallback: byte estimation if buffer is forced (should not happen in new flow)
            return audioInput.length / AUDIO_FORMAT.BYTES_PER_SECOND;
        }

        // 너무 짧으면 기본값 사용
        if (duration < 0.5) {
            return AUDIO_FORMAT.FALLBACK_DURATION;
        }

        // 패딩 추가 (음성 끝난 후 여유 시간)
        return duration + AUDIO_FORMAT.PADDING_SECONDS;
    } catch (error) {
        console.warn(`⚠️ Failed to calculate precise duration: ${error}`);
        return AUDIO_FORMAT.FALLBACK_DURATION;
    }
}

/**
 * Placeholder 이미지 생성
 * 이미지 생성 실패 시 사용되는 기본 이미지
 *
 * @param projectDir - 프로젝트 디렉토리 경로
 * @param imagePath - 저장할 이미지 경로
 * @param log - 로깅 함수
 */
function createPlaceholderImage(projectDir: string, imagePath: string, log: (msg: string) => void): void {
    const assetsDir = path.dirname(projectDir);

    // 1차 시도: robot_coworker.png 복사
    const primaryFallback = path.join(assetsDir, 'robot_coworker.png');
    if (fs.existsSync(primaryFallback)) {
        fs.copyFileSync(primaryFallback, imagePath);
        log(`      📷 Using fallback image: robot_coworker.png`);
        return;
    }

    // 2차 시도: 1x1 투명 PNG 생성 (최소한의 placeholder)
    // PNG 헤더 + 1x1 투명 픽셀 데이터
    const transparentPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  // 1x1 dimensions
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,  // 8-bit RGBA
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,  // IDAT chunk
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,  // Compressed data
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,  // ...
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,  // IEND chunk
        0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(imagePath, transparentPng);
    log(`      ⚠️ Created minimal placeholder image`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);

    // ─────────────────────────────────────────────────────────────────────────
    // CLI 옵션 파싱
    // ─────────────────────────────────────────────────────────────────────────
    const isJsonMode = args.includes('--json');      // Agent 연동용 JSON 출력
    const isRefineMode = args.includes('refine');    // 부분 재생성 모드

    /**
     * JSON 모드에서 구조화된 응답 출력 후 종료
     */
    const exitJson = (data: AgentOutput, code = 0) => {
        if (isJsonMode) {
            console.log(JSON.stringify(data, null, 2));
        } else if (code !== 0) {
            console.error(`❌ Error: ${data.error}`);
        }
        process.exit(code);
    };

    /**
     * 로깅 헬퍼 (JSON 모드에서는 출력 억제)
     */
    const log = (msg: string) => {
        if (!isJsonMode) console.log(msg);
    };

    /**
     * 환경 변수 검증
     * 선택된 Provider에 필요한 API Key가 있는지 확인
     */
    const validateEnv = () => {
        const missingKeys: string[] = [];

        // Text Provider Check
        if (process.env.TEXT_PROVIDER === 'claude' && !process.env.CLAUDE_API_KEY) missingKeys.push('CLAUDE_API_KEY');
        if (process.env.TEXT_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) missingKeys.push('GEMINI_API_KEY');

        // TTS Provider Check
        if (process.env.TTS_PROVIDER === 'elevenlabs' && !process.env.ELEVENLABS_API_KEY) missingKeys.push('ELEVENLABS_API_KEY');

        // Image Provider Check
        if (process.env.IMAGE_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) missingKeys.push('OPENAI_API_KEY');

        if (missingKeys.length > 0) {
            if (isJsonMode) {
                exitJson({ status: 'error', error: `Missing API Keys: ${missingKeys.join(', ')}` }, 1);
            }
            console.error('❌ Error: Missing API Keys required for selected providers.');
            console.error(`   Missing: ${missingKeys.join(', ')}`);
            console.error('   Please check your .env file.');
            process.exit(1);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Step 0: 환경 설정 검증
    // ─────────────────────────────────────────────────────────────────────────
    validateEnv();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1: 입력 파싱
    // ─────────────────────────────────────────────────────────────────────────
    const promptArgs = args.filter(arg => !arg.startsWith('--') && arg !== 'refine');
    let prompt = promptArgs.join(' ');

    // --id 옵션: 프로젝트 ID 지정
    const idArg = args.find(arg => arg.startsWith('--id='));
    const customId = idArg ? idArg.split('=')[1] : null;

    // --file 옵션: 파일에서 프롬프트/시나리오 읽기
    // 경로 탐색 순서: 1) 입력값 그대로 → 2) scenarios/ → 3) public/scenarios/
    const fileArg = args.find(arg => arg.startsWith('--file='));
    if (fileArg) {
        const inputPath = fileArg.split('=')[1];

        // ───────────────────────────────────────────────────────────────────
        // 파일 경로 탐색 (우선순위 순)
        // 1. 입력된 경로 그대로 (절대 경로 또는 현재 디렉토리 기준 상대 경로)
        // 2. scenarios/ 디렉토리 내 파일
        // 3. public/scenarios/ 디렉토리 내 파일
        // ───────────────────────────────────────────────────────────────────
        const searchPaths = [
            inputPath,                                              // 원본 경로
            path.resolve(inputPath),                                // 절대 경로로 변환
            path.join(INPUT_PATHS.SCENARIOS_DIR, inputPath),        // scenarios/filename
            path.join(INPUT_PATHS.PUBLIC_SCENARIOS_DIR, inputPath), // public/scenarios/filename
            path.join(process.cwd(), inputPath)                     // 현재 작업 디렉토리 기준
        ];

        let resolvedPath: string | null = null;
        for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath)) {
                resolvedPath = searchPath;
                break;
            }
        }

        if (resolvedPath) {
            log(`📂 Reading scenario from: ${resolvedPath}`);
            try {
                prompt = fs.readFileSync(resolvedPath, 'utf-8');
            } catch (err) {
                console.error(`❌ Error reading file: ${err}`);
                process.exit(1);
            }
        } else {
            // 파일을 찾지 못한 경우: 탐색한 경로 목록 출력
            console.error(`❌ Error: Scenario file not found: ${inputPath}`);
            console.error(`\n🔍 Searched paths:`);
            searchPaths.forEach((p, i) => console.error(`   ${i + 1}. ${p}`));
            console.error(`\n💡 Tip: Place your JSON file in one of these locations:`);
            console.error(`   - scenarios/${inputPath}`);
            console.error(`   - public/scenarios/${inputPath}`);
            console.error(`   - Or use absolute path: --file=/full/path/to/${inputPath}`);
            process.exit(1);
        }
    }

    // 입력 검증
    if (!prompt && !isRefineMode) {
        if (isJsonMode) {
            exitJson({ status: 'error', error: 'No prompt provided' }, 1);
        }
        console.error('❌ Error: Please provide a prompt or a --file argument.');
        console.log('Usage:');
        console.log('  모드 1 (Quick Start): npm run generate "비 오는 날의 조용한 카페"');
        console.log('  모드 2 (Scenario):    npm run generate -- --file=scenario.json --id=my-project');
        process.exit(1);
    }

    log(`🚀 Generating content for: "${prompt.substring(0, 50)}..."`);

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2: AI Provider 초기화
    // Factory 패턴으로 환경변수에 따라 적절한 Provider 주입
    // ─────────────────────────────────────────────────────────────────────────
    const textProvider = getTextProvider(
        (process.env.TEXT_PROVIDER as any) || 'mock',
        process.env.TEXT_PROVIDER === 'claude' ? process.env.CLAUDE_API_KEY : process.env.GEMINI_API_KEY
    );
    const ttsProvider = getTTSProvider(
        (process.env.TTS_PROVIDER as any) || 'mock',
        process.env.TTS_PROVIDER === 'elevenlabs' ? process.env.ELEVENLABS_API_KEY : process.env.GEMINI_API_KEY
    );
    const imageProvider = getImageProvider(
        (process.env.IMAGE_PROVIDER as any) || 'mock',
        process.env.IMAGEN_API_KEY || process.env.GEMINI_API_KEY
    );

    try {
        // ─────────────────────────────────────────────────────────────────────
        // Step 3: Scene 준비 (통합 파이프라인)
        //
        // 입력 방식에 따라 Scene을 준비:
        // - 모드 2: JSON 배열 → 그대로 사용
        // - 모드 1: 텍스트 프롬프트 → AI가 다중 Scene 자동 생성
        // ─────────────────────────────────────────────────────────────────────
        let scenes: any[] = [];

        // 모드 2: JSON 형식 시나리오 파싱 시도
        try {
            const parsed = JSON.parse(prompt);
            if (Array.isArray(parsed)) {
                // JSON Scene 유효성 검증 및 정규화
                scenes = parsed.map((scene, index) => {
                    const sceneId = scene.scene_id || (index + 1);

                    // script 필드 검증 (필수)
                    if (!scene.script || typeof scene.script !== 'string') {
                        throw new Error(`Scene ${sceneId}: 'script' 필드가 없거나 유효하지 않습니다.`);
                    }

                    // image_prompt 필드 검증 (image_prompt 또는 imagePrompt 허용)
                    const imagePrompt = scene.image_prompt || scene.imagePrompt;
                    if (!imagePrompt || typeof imagePrompt !== 'string') {
                        throw new Error(`Scene ${sceneId}: 'image_prompt' 필드가 없거나 유효하지 않습니다.`);
                    }

                    // 정규화된 Scene 반환
                    return {
                        scene_id: sceneId,
                        duration: scene.duration || 5,
                        script: scene.script.trim(),
                        image_prompt: imagePrompt.trim(),
                        type: scene.type, // Preserve scene type (e.g. walking-in)
                        source_type: scene.source_type || 'AI_GENERATION'
                    };
                });

                log(`📜 [모드 2] Loaded ${scenes.length} scenes from structured JSON input.`);
            }
        } catch (e: any) {
            // JSON 파싱 실패 또는 유효성 검증 실패
            if (e.message && e.message.includes('Scene')) {
                // 유효성 검증 실패 → 에러 출력 후 종료
                console.error(`❌ JSON 유효성 검증 실패: ${e.message}`);
                process.exit(1);
            }
            // JSON이 아님 → 모드 1로 진행
        }

        // ─────────────────────────────────────────────────────────────────────
        // 모드 1: Simple Prompt → AI가 다중 Scene 자동 생성
        // USECASE.md 요구사항: "AI가 스스로 3~5개의 장면을 상상하여 생성"
        // ─────────────────────────────────────────────────────────────────────
        if (scenes.length === 0) {
            log('🎨 [모드 1] Generating multiple scenes via AI...');

            // generateScenes 메서드가 있으면 다중 Scene 생성
            if (typeof (textProvider as any).generateScenes === 'function') {
                scenes = await (textProvider as any).generateScenes(prompt, {
                    sceneCount: 4,  // 3~5 범위의 중간값
                    language: 'ko'
                });
                log(`✅ AI generated ${scenes.length} scenes automatically.`);
            } else {
                // generateScenes 미지원 Provider (레거시 호환)
                // 단일 Scene으로 폴백
                log('⚠️ Provider does not support multi-scene generation, falling back to single scene.');
                const result = await textProvider.generateContent(prompt);
                scenes = [{
                    scene_id: 1,
                    duration: 5,
                    script: result.script,
                    image_prompt: result.imagePrompt,
                    source_type: 'AI_GENERATION'
                }];
            }

            log(`✅ Total ${scenes.length} scene(s) prepared.`);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Step 4: 프로젝트 폴더 설정
        // ─────────────────────────────────────────────────────────────────────
        let projectId = customId;
        if (!projectId) {
            // 기본 ID: project-YYMMDD 형식
            const date = new Date();
            const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
            projectId = `project-${yymmdd}`;
        }

        const assetsDir = path.join(__dirname, '../public/assets');
        const projectDir = path.join(assetsDir, projectId);

        // 프로젝트 폴더 생성 (없으면)
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
            log(`📂 Created project folder: assets/${projectId}`);
        } else {
            // 모드 3: Refine Workflow - 기존 폴더 재사용 (스마트 캐싱)
            log(`♻️  Reusing existing project folder: assets/${projectId}`);
        }

        // ─────────────────────────────────────────────────────────────────────
        // 타임라인 데이터 초기화
        // ─────────────────────────────────────────────────────────────────────
        const tracks: any[] = [];           // Remotion Track 배열
        const generatedFiles: string[] = []; // 생성된 파일 목록
        let currentStartFrame = 0;          // 현재 Scene 시작 프레임
        const fps = VIDEO_CONFIG.FPS;       // 프레임 레이트

        // ─────────────────────────────────────────────────────────────────────
        // Step 5: Scene별 에셋 생성 (배치 처리)
        //
        // 각 Scene에 대해:
        // 1. TTS 음성 생성 (또는 캐시 사용)
        // 2. 배경 이미지 생성 (또는 캐시 사용)
        // 3. Remotion Track 추가 (audio, image, text)
        // ─────────────────────────────────────────────────────────────────────
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const sceneIndex = i + 1;

            log(`\n🎬 Processing Scene ${sceneIndex}/${scenes.length}...`);

            // ───────────────────────────────────────────────────────────────
            // Scene 필드 안전하게 추출 (모드 1/2 호환)
            // - 모드 2 (JSON): 이미 정규화됨 (image_prompt)
            // - 모드 1 (AI 생성): image_prompt 또는 imagePrompt 가능
            // ───────────────────────────────────────────────────────────────
            const sceneScript = scene.script || '';
            const sceneImagePrompt = scene.image_prompt || scene.imagePrompt || '';

            // 필수 필드 검증 (안전장치)
            if (!sceneScript) {
                console.error(`❌ Scene ${sceneIndex}: script가 비어있습니다. 건너뜁니다.`);
                continue;
            }

            // ───────────────────────────────────────────────────────────────
            // 5-1. TTS 음성 생성
            // 모드 3 (Refine): 파일 존재 시 스킵 (스마트 캐싱)
            // ───────────────────────────────────────────────────────────────
            const voiceFileName = `voice-${sceneIndex}.mp3`;
            const voicePath = path.join(projectDir, voiceFileName);
            let audioBuffer: Buffer | ArrayBuffer;

            if (fs.existsSync(voicePath)) {
                // 캐시 히트: 기존 파일 사용
                log(`   ♻️  [Cache Hit] TTS: ${voiceFileName}`);
                audioBuffer = fs.readFileSync(voicePath);
            } else {
                // 캐시 미스: AI 생성
                const scriptPreview = sceneScript.substring(0, 30);
                log(`   🗣️  [Generating] TTS: "${scriptPreview}..."`);
                const ttsResult = await ttsProvider.generateSpeech(sceneScript);
                audioBuffer = ttsResult.audio;
                fs.writeFileSync(voicePath, Buffer.from(audioBuffer));
            }
            generatedFiles.push(`assets/${projectId}/${voiceFileName}`);

            // ───────────────────────────────────────────────────────────────
            // 5-2. Auto-Duration: 오디오 길이 기반 자동 조절
            // USECASE.md: "오디오 파일 길이를 측정하여, 영상 길이를 자동으로 늘린다"
            // get-audio-duration 라이브러리를 사용하여 정확한 길이 측정
            // ───────────────────────────────────────────────────────────────
            const finalDurationSec = await calculateAudioDuration(voicePath);
            log(`      ⏱️  Duration: ${finalDurationSec.toFixed(2)}s (Precise Calculation)`);

            const durationInFrames = Math.floor(finalDurationSec * fps);

            // Audio Track 추가 (파일이 존재할 때만)
            if (fs.existsSync(voicePath)) {
                tracks.push({
                    id: `voice-${sceneIndex}`,
                    type: 'audio',
                    src: `assets/${projectId}/${voiceFileName}`,
                    startFrame: currentStartFrame,
                    durationInFrames: durationInFrames,
                    layer: 1,
                    volume: 1.0
                });
            } else {
                log(`      ⚠️  [Warning] Skipping Audio Track (File not found)`);
            }

            // ───────────────────────────────────────────────────────────────
            // 5-3. 배경 이미지 생성
            // 모드 3 (Refine): 파일 존재 시 스킵 (스마트 캐싱)
            // ───────────────────────────────────────────────────────────────
            const imageFileName = `scene-${sceneIndex}.png`;
            const imagePath = path.join(projectDir, imageFileName);

            if (fs.existsSync(imagePath)) {
                // 캐시 히트: 기존 파일 사용
                log(`   ♻️  [Cache Hit] Image: ${imageFileName}`);
            } else {
                // 캐시 미스: AI 생성
                try {
                    // image_prompt가 없으면 placeholder 사용
                    if (!sceneImagePrompt) {
                        log(`   ⚠️  [Warning] No image_prompt for Scene ${sceneIndex}, using placeholder`);
                        createPlaceholderImage(projectDir, imagePath, log);
                    } else {
                        const promptPreview = sceneImagePrompt.substring(0, 30);
                        log(`   🎨  [Generating] Image: "${promptPreview}..."`);
                        const imageBuf = await imageProvider.generateImage(sceneImagePrompt);
                        fs.writeFileSync(imagePath, Buffer.from(imageBuf));

                        // 🎨 Asset Integrity Check
                        if (fs.statSync(imagePath).size === 0) {
                            throw new Error("Generated image file is empty (0 bytes)");
                        }
                    }
                } catch (err) {
                    // 이미지 생성 실패 또는 0바이트 파일 시 placeholder 사용
                    console.error(`      ⚠️ Image generation failed: ${err}`);
                    createPlaceholderImage(projectDir, imagePath, log);
                }
            }
            generatedFiles.push(`assets/${projectId}/${imageFileName}`);

            // ───────────────────────────────────────────────────────────────
            // 5-4. Remotion Track 추가
            // ───────────────────────────────────────────────────────────────

            // 5-4. Remotion Track 추가 (Visual Track)
            // ───────────────────────────────────────────────────────────────

            // 'walking-in' 타입이거나 Scene에서 요청된 경우 WalkingScene 적용
            if (scene.type === 'walking-in') {
                tracks.push({
                    id: `scene-${sceneIndex}-visual`,
                    type: 'walking-scene',
                    src: `assets/${projectId}/${imageFileName}`,
                    text: sceneScript,
                    startFrame: currentStartFrame,
                    durationInFrames: durationInFrames,
                    layer: 0,
                    // WalkingScene component handles its own animation
                });
            } else {
                // Default: Image Track with Ken Burns
                tracks.push({
                    id: `scene-${sceneIndex}-bg`,
                    type: 'image',
                    src: `assets/${projectId}/${imageFileName}`,
                    startFrame: currentStartFrame,
                    durationInFrames: durationInFrames,
                    layer: 0,
                    animation: {
                        type: 'ken-burns',
                        direction: i % 2 === 0 ? 'in' : 'random',
                        intensity: 'subtle'
                    },
                    transition: {
                        type: 'fade',
                        durationInFrames: 15
                    }
                });

                // Text Track for Standard Scenes (Overlay)
                // If WalkingScene is used, it often has its own text overlay style,
                // so we might duplicate text if we are not careful.
                // WalkingScene renders text internally. So we ONLY add Text Track for normal scenes.
                tracks.push({
                    id: `scene-${sceneIndex}-text`,
                    type: 'text',
                    text: sceneScript,
                    fontSize: 48,
                    color: '#ffffff',
                    x: 50,
                    y: 85,
                    startFrame: currentStartFrame,
                    durationInFrames: durationInFrames,
                    layer: 2
                });
            }

            // Text Track logic moved to Visual Track block to prevent duplication in WalkingScene
            // ───────────────────────────────────────────────────────────────

            // 다음 Scene 시작 프레임 업데이트
            currentStartFrame += durationInFrames;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Step 6: 타임라인 JSON 생성
        // Remotion이 비디오를 렌더링하기 위한 설계도
        // ─────────────────────────────────────────────────────────────────────
        const advancedContent: AdvancedContent = {
            title: scenes.length > 1
                ? `AI Video (${scenes.length} Scenes)`
                : `AI Video: ${prompt.substring(0, 30)}`,
            width: VIDEO_CONFIG.WIDTH,    // 1080 (세로 영상)
            height: VIDEO_CONFIG.HEIGHT,  // 1920 (세로 영상)
            fps: fps,
            backgroundMusic: {
                src: "assets/background.mp3",
                volume: 0.2,
                loop: true
            },
            tracks: tracks  // 순차적으로 정렬된 Track 배열
        };

        // ─────────────────────────────────────────────────────────────────────
        // Step 6-1: 프로젝트별 JSON 저장
        // 각 프로젝트는 자체 타임라인 JSON을 가짐
        // ─────────────────────────────────────────────────────────────────────
        const projectJsonFileName = `${projectId}.json`;
        const projectJsonPath = path.join(projectDir, projectJsonFileName);
        fs.writeFileSync(projectJsonPath, JSON.stringify(advancedContent, null, 4));
        log(`💾 Project JSON saved: public/assets/${projectId}/${projectJsonFileName}`);

        // ─────────────────────────────────────────────────────────────────────
        // Step 6-2: 기본 advanced-content.json 업데이트
        // Remotion Studio에서 즉시 미리보기를 위해 기본 파일도 업데이트
        // (가장 최근 프로젝트가 기본으로 로드됨)
        // ─────────────────────────────────────────────────────────────────────
        const resourcesDir = path.join(__dirname, '../src/resources');
        if (!fs.existsSync(resourcesDir)) {
            fs.mkdirSync(resourcesDir, { recursive: true });
        }
        const defaultJsonPath = path.join(resourcesDir, 'advanced-content.json');
        fs.writeFileSync(defaultJsonPath, JSON.stringify(advancedContent, null, 4));

        // ─────────────────────────────────────────────────────────────────────
        // Step 7: 완료 출력
        // ─────────────────────────────────────────────────────────────────────
        log(`\n${'─'.repeat(60)}`);
        log(`✅ Generation Complete!`);
        log(`${'─'.repeat(60)}`);
        log(`📁 Project ID:    ${projectId}`);
        log(`📂 Assets:        public/assets/${projectId}/`);
        log(`📄 Project JSON:  public/assets/${projectId}/${projectJsonFileName}`);
        log(`📄 Default JSON:  src/resources/advanced-content.json (synced)`);
        log(`🎬 Total Scenes:  ${scenes.length}`);
        log(`⏱️  Total Frames:  ${currentStartFrame} (${(currentStartFrame / fps).toFixed(1)}s)`);
        log(`${'─'.repeat(60)}`);
        log(`\n🚀 Run 'npm run dev' to preview in Remotion Studio`);

        // JSON 모드: 구조화된 응답 출력
        if (isJsonMode) {
            exitJson({
                status: 'success',
                projectId,
                projectPath: `public/assets/${projectId}`,
                projectJsonPath: `public/assets/${projectId}/${projectJsonFileName}`,
                previewUrl: 'http://localhost:3000',
                assets: generatedFiles
            });
        }

    } catch (error: any) {
        // ─────────────────────────────────────────────────────────────────────
        // 에러 처리
        // ─────────────────────────────────────────────────────────────────────
        if (isJsonMode) {
            exitJson({ status: 'error', error: error.message || 'Unknown error' }, 1);
        } else {
            console.error('\n❌ Generation Failed:', error);
            process.exit(1);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────────────────────
main();
