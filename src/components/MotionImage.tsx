import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig, Img, random } from 'remotion';

interface MotionImageProps {
    src: string;
    animation?: {
        type: 'static' | 'ken-burns' | 'pan' | 'zoom' | 'shake';
        direction?: 'in' | 'out' | 'left' | 'right' | 'up' | 'down' | 'random';
        intensity?: 'subtle' | 'medium' | 'dramatic';
        speed?: number;
    };
    style?: React.CSSProperties;
}

export const MotionImage: React.FC<MotionImageProps> = ({ src, animation, style }) => {
    const frame = useCurrentFrame();
    const { durationInFrames, width, height } = useVideoConfig();

    const config = useMemo(() => {
        const intensityMap = {
            subtle: 1.1,
            medium: 1.3,
            dramatic: 1.5,
        };
        const scaleFactor = intensityMap[animation?.intensity || 'subtle'];

        // Shake intensity (pixels)
        const shakeMap = {
            subtle: 5,
            medium: 15,
            dramatic: 30,
        };
        const shakeAmount = shakeMap[animation?.intensity || 'subtle'];

        return { scaleFactor, shakeAmount };
    }, [animation?.intensity]);

    // ─────────────────────────────────────────────────────────────────────────────
    // Animation Logic
    // ─────────────────────────────────────────────────────────────────────────────

    // 1. Zoom Logic
    const zoomScale = useMemo(() => {
        if (animation?.type === 'zoom' || animation?.type === 'ken-burns') {
            const start = animation.direction === 'out' ? config.scaleFactor : 1;
            const end = animation.direction === 'out' ? 1 : config.scaleFactor;

            return interpolate(frame, [0, durationInFrames], [start, end], {
                extrapolateRight: 'clamp',
            });
        }
        return 1; // Default
    }, [animation, frame, durationInFrames, config]);

    // 2. Pan Logic (Translate)
    const panTranslate = useMemo(() => {
        const movePercent = (config.scaleFactor - 1) * 100 / 2; // Move up to the edge of the scaled image

        if (animation?.type === 'pan' || animation?.type === 'ken-burns') {
            let x = 0;
            let y = 0;

            const progress = interpolate(frame, [0, durationInFrames], [0, 1]);

            switch (animation.direction) {
                case 'left': x = interpolate(progress, [0, 1], [0, -movePercent]); break;
                case 'right': x = interpolate(progress, [0, 1], [0, movePercent]); break;
                case 'up': y = interpolate(progress, [0, 1], [0, -movePercent]); break;
                case 'down': y = interpolate(progress, [0, 1], [0, movePercent]); break;
                // Ken Burns Random Logic handled separately or simplified here
            }
            return { x, y };
        }
        return { x: 0, y: 0 };
    }, [animation, frame, durationInFrames, config]);

    // 3. Shake Logic
    const shakeTranslate = useMemo(() => {
        if (animation?.type === 'shake') {
            const shakeX = (random(frame) - 0.5) * config.shakeAmount;
            const shakeY = (random(frame + 1000) - 0.5) * config.shakeAmount;
            return { x: shakeX, y: shakeY };
        }
        return { x: 0, y: 0 };
    }, [animation, frame, config]);


    // ─────────────────────────────────────────────────────────────────────────────
    // Error Handling
    // ─────────────────────────────────────────────────────────────────────────────
    const [error, setError] = React.useState(false);

    // Combine Transforms
    const transform = `
        scale(${zoomScale})
        translate(${panTranslate.x + shakeTranslate.x}%, ${panTranslate.y + shakeTranslate.y}%)
    `;

    if (error) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#333',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff',
                fontFamily: 'sans-serif',
                ...style
            }}>
                <div style={{ fontSize: 40, marginBottom: 20 }}>🖼️</div>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>IMAGE NOT FOUND</div>
                <div style={{ fontSize: 16, opacity: 0.7, marginTop: 10 }}>{src}</div>
            </div>
        );
    }

    return (
        <div style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: '#000',
            ...style
        }}>
            <Img
                src={src}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: transform,
                    transformOrigin: 'center center',
                }}
                onError={() => {
                    console.warn(`[MotionImage] Failed to load image: ${src}`);
                    setError(true);
                }}
            />
        </div>
    );
};
