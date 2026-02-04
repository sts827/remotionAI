/**
 * =============================================================================
 * Ken Burns Effect Component
 * =============================================================================
 *
 * 정지 이미지에 동적인 움직임을 부여하는 Ken Burns 효과 컴포넌트
 *
 * ## Ken Burns 효과란?
 * 다큐멘터리 제작자 Ken Burns의 이름에서 유래
 * 정지 이미지를 천천히 줌인/아웃 또는 패닝하여 생동감 부여
 *
 * ## 지원 방향 (direction)
 * - 'in': 줌인 (1.0 → maxScale)
 * - 'out': 줌아웃 (maxScale → 1.0)
 * - 'pan-left': 왼쪽으로 패닝
 * - 'pan-right': 오른쪽으로 패닝
 * - 'random': src 기반 결정적 랜덤 선택
 *
 * ## 강도 (intensity)
 * - 'subtle': 1.1배 (미세한 움직임)
 * - 'medium': 1.25배 (보통)
 * - 'dramatic': 1.4배 (극적인 움직임)
 *
 * ## 사용 예시
 * ```tsx
 * <KenBurnsImage
 *   src="assets/scene-1.png"
 *   direction="in"
 *   intensity="subtle"
 * />
 * ```
 *
 * =============================================================================
 */

import React, { useMemo } from 'react';
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface KenBurnsImageProps {
    /** 이미지 소스 경로 */
    src: string;
    /** 애니메이션 방향 (기본: 'in') */
    direction?: 'in' | 'out' | 'pan-left' | 'pan-right' | 'random';
    /** 애니메이션 강도 (기본: 'medium') */
    intensity?: 'subtle' | 'medium' | 'dramatic';
    /** 추가 스타일 */
    style?: React.CSSProperties;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 강도별 최대 스케일 값
 * - subtle: 10% 확대 (미세한 움직임)
 * - medium: 25% 확대 (표준적인 Ken Burns)
 * - dramatic: 40% 확대 (강렬한 효과)
 */
const SCALE_MAP = {
    subtle: 1.1,
    medium: 1.25,
    dramatic: 1.4
} as const;

/** 랜덤 방향 선택지 */
const DIRECTION_OPTIONS = ['in', 'out', 'pan-left', 'pan-right'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
    src,
    direction = 'in',
    intensity = 'medium',
    style
}) => {
    const frame = useCurrentFrame();
    const { width, durationInFrames } = useVideoConfig();

    // 강도에 따른 최대 스케일 결정
    const maxScale = SCALE_MAP[intensity];

    // ─────────────────────────────────────────────────────────────────────────
    // 방향 결정 (random인 경우 결정적 해시 사용)
    // src 문자열의 해시값을 사용하여 동일한 이미지는 항상 같은 방향
    // ─────────────────────────────────────────────────────────────────────────
    const actualDirection = useMemo(() => {
        if (direction !== 'random') return direction;

        // src 문자열의 간단한 해시 계산
        const hash = src.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return DIRECTION_OPTIONS[hash % DIRECTION_OPTIONS.length];
    }, [direction, src]);

    // ─────────────────────────────────────────────────────────────────────────
    // 애니메이션 진행도 계산 (0 → 1)
    // Linear easing으로 부드러운 움직임
    // ─────────────────────────────────────────────────────────────────────────
    const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
        easing: Easing.linear,
        extrapolateLeft: "clamp",   // 0 이하에서 0 유지
        extrapolateRight: "clamp",  // 1 이상에서 1 유지
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 방향별 transform 값 계산
    // ─────────────────────────────────────────────────────────────────────────
    let scale = 1;
    let translateX = 0;

    switch (actualDirection) {
        case 'in':
            // Zoom In: 원본 → 확대 (가장 많이 사용되는 효과)
            scale = interpolate(progress, [0, 1], [1, maxScale]);
            break;

        case 'out':
            // Zoom Out: 확대 → 원본 (장면 전환 시 효과적)
            scale = interpolate(progress, [0, 1], [maxScale, 1]);
            break;

        case 'pan-left':
            // Pan Left: 오른쪽에서 왼쪽으로 이동
            scale = maxScale;
            translateX = interpolate(progress, [0, 1], [0, -((width * (maxScale - 1)) / 2)]);
            break;

        case 'pan-right':
            // Pan Right: 왼쪽에서 오른쪽으로 이동
            scale = maxScale;
            translateX = interpolate(progress, [0, 1], [0, ((width * (maxScale - 1)) / 2)]);
            break;

        default:
            scale = 1;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
            <Img
                src={src}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',  // 이미지가 컨테이너를 채우도록
                    transform: `scale(${scale}) translate(${translateX}px, 0px)`,
                    transformOrigin: 'center center',  // 중앙 기준 변환
                }}
            />
        </AbsoluteFill>
    );
};
