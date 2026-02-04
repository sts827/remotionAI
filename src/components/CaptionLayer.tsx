import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { CaptionAsset } from '../advanced-types';

interface CaptionLayerProps {
    asset: CaptionAsset;
}

export const CaptionLayer: React.FC<CaptionLayerProps> = ({ asset }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // 1. Calculate current time in milliseconds relative to the start of this asset
    // The sequence handles the global offset, so 'frame 0' here is the start of the asset.
    const currentTimeMs = (frame / fps) * 1000;

    // 2. Find the active segment
    const activeSegment = asset.segments.find(
        (seg) => currentTimeMs >= seg.startMs && currentTimeMs < seg.endMs
    );

    if (!activeSegment) {
        return null;
    }

    // 3. Animation Logic
    const { animation, fontSize, color, fontFamily } = asset.style;

    // Default Style
    const baseStyle: React.CSSProperties = {
        fontFamily,
        fontSize,
        color,
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        textAlign: 'center',
        width: '100%',
        position: 'absolute',
        top: '80%', // Default position near bottom
        left: 0,
    };

    let animatedStyle: React.CSSProperties = { ...baseStyle };

    if (animation === 'pop') {
        // Pop-up effect: spring animation on scale
        // We calculate 'time since word start' in frames
        const timeSinceStart = (currentTimeMs - activeSegment.startMs) / 1000; // seconds
        const framesSinceStart = timeSinceStart * fps;

        const scale = spring({
            fps,
            frame: framesSinceStart,
            config: {
                damping: 10,
                stiffness: 100,
            },
        });

        animatedStyle.transform = `scale(${scale})`;
    } else if (animation === 'fade') {
        const timeSinceStart = (currentTimeMs - activeSegment.startMs) / 1000; // seconds
        const framesSinceStart = timeSinceStart * fps;

        const opacity = interpolate(framesSinceStart, [0, 5], [0, 1], {
            extrapolateRight: 'clamp'
        });

        animatedStyle.opacity = opacity;
    }

    return (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
            <div style={animatedStyle}>
                {activeSegment.text}
            </div>
        </AbsoluteFill>
    );
};
