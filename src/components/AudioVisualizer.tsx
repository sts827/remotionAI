import React from 'react';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { useCurrentFrame, useVideoConfig } from 'remotion';

interface AudioVisualizerProps {
    src: string;
    gap?: number;
    barWidth?: number;
    color?: string;
    roundness?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    src,
    gap = 4,
    barWidth = 6,
    color = '#00ffcc',
    roundness = 5,
}) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // Visualize frequency data
    const audioData = useAudioData(src);

    if (!audioData) {
        return null;
    }

    // Determine how many bars could fit
    const availableWidth = width;
    const barCount = Math.floor(availableWidth / (barWidth + gap));

    const frequencyData = visualizeAudio({
        fps,
        frame,
        audioData,
        numberOfSamples: barCount,
    });

    const visualizeHeight = 200; // Max height in px

    return (
        <div style={{
            position: 'absolute',
            bottom: 50,
            left: 0,
            width: '100%',
            height: visualizeHeight,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: gap,
        }}>
            {frequencyData.map((v, i) => {
                const heightPct = Math.min(100, Math.max(5, v * 100)); // Rough scaling
                return (
                    <div
                        key={i}
                        style={{
                            width: barWidth,
                            height: `${heightPct}%`,
                            backgroundColor: color,
                            borderRadius: `${roundness}px`,
                            opacity: 0.8,
                        }}
                    />
                );
            })}
        </div>
    );
};
