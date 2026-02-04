/**
 * =============================================================================
 * Remotion Root Component
 * =============================================================================
 *
 * Remotion 비디오 렌더링의 진입점
 * - advanced-content.json에서 타임라인 데이터 로드
 * - calculateMetadata로 동적 Duration 계산
 *
 * 기본 해상도: 1080x1920 (세로 영상, 9:16 비율)
 * - TikTok, Instagram Reels, YouTube Shorts 등 숏폼 플랫폼 최적화
 *
 * ## 프로젝트 JSON 로딩
 * - 기본값: src/resources/advanced-content.json (가장 최근 프로젝트)
 * - 프로젝트별 JSON: public/assets/{projectId}/{projectId}.json
 *
 * =============================================================================
 */

import React from 'react';
import { Composition } from 'remotion';
import { AdvancedComposition } from './AdvancedComposition';
import { EditorSchema, EditorConfig } from './advanced-types';

// 기본 JSON 로드 (가장 최근 생성된 프로젝트)
// generate-content.ts가 생성 시 이 파일을 업데이트함
import advancedContentJson from './resources/advanced-content.json';

/**
 * 기본 비디오 설정
 * generate-content.ts의 VIDEO_CONFIG와 동일하게 유지
 */
const DEFAULT_CONFIG = {
    WIDTH: 1080,   // 세로 영상 너비
    HEIGHT: 1920,  // 세로 영상 높이
    FPS: 30,
    MIN_FRAMES: 150  // 최소 5초 (30fps × 5)
};

/**
 * JSON 파일을 EditorConfig 타입으로 캐스팅
 * Zod 스키마와 타입 호환성 보장
 */
const advancedContent = advancedContentJson as unknown as EditorConfig;

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="AdvancedEditor"
                component={AdvancedComposition}
                // ─────────────────────────────────────────────────────────────
                // 기본값 (calculateMetadata가 덮어씀)
                // ─────────────────────────────────────────────────────────────
                durationInFrames={DEFAULT_CONFIG.MIN_FRAMES}
                fps={DEFAULT_CONFIG.FPS}
                width={DEFAULT_CONFIG.WIDTH}
                height={DEFAULT_CONFIG.HEIGHT}
                schema={EditorSchema}
                defaultProps={advancedContent}
                // ─────────────────────────────────────────────────────────────
                // 동적 메타데이터 계산
                // advanced-content.json의 tracks에서 실제 Duration 계산
                // ─────────────────────────────────────────────────────────────
                calculateMetadata={({ props }) => {
                    const fps = props.fps || DEFAULT_CONFIG.FPS;

                    // 모든 Track 중 가장 늦게 끝나는 시점 찾기
                    const maxDuration = props.tracks.reduce((max, track) => {
                        const trackEnd = (track.startFrame || 0) + (track.durationInFrames || 0);
                        return Math.max(max, trackEnd);
                    }, 0);

                    return {
                        // Duration: Track 계산값 또는 최소값
                        durationInFrames: maxDuration || DEFAULT_CONFIG.MIN_FRAMES,
                        fps,
                        // 해상도: JSON에서 지정한 값 사용 (generate-content.ts와 일치)
                        width: props.width || DEFAULT_CONFIG.WIDTH,
                        height: props.height || DEFAULT_CONFIG.HEIGHT
                    };
                }}
            />
        </>
    );
};
