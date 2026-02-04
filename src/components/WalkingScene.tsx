import React from 'react';
import { AbsoluteFill, Img, Video, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { Scene } from '../types';

interface WalkingSceneProps {
    scene: Scene;
}

export const WalkingScene: React.FC<WalkingSceneProps> = ({ scene }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    // Calculate scale factor to simulate walking towards camera (Zoom In)
    // Scale from 1.0 to 1.3 over the duration
    const scale = interpolate(
        frame,
        [0, durationInFrames],
        [1.0, 1.3],
        {
            easing: Easing.out(Easing.cubic),
            extrapolateRight: 'clamp',
        }
    );

    // Optional: Subtle vertical movement to simulate step bounce (very subtle)
    const translateY = interpolate(
        frame,
        [0, durationInFrames],
        [0, 50], // Move slightly down as we get closer (or up depending on perspective, usually focal point stays similar)
        { extrapolateRight: 'clamp' }
    );

    return (
        <AbsoluteFill>
            <AbsoluteFill style={{ overflow: 'hidden' }}>
                {scene.image.endsWith('.mp4') || scene.image.endsWith('.webm') ? (
                    <Video
                        src={staticFile(scene.image)}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: `scale(${scale}) translateY(${translateY}px)`,
                        }}
                    />
                ) : (
                    <Img
                        src={staticFile(scene.image)}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: `scale(${scale}) translateY(${translateY}px)`,
                        }}
                    />
                )}
            </AbsoluteFill>
            <AbsoluteFill style={{
                justifyContent: 'flex-end',
                alignItems: 'center',
                paddingBottom: 100,
            }}>
                <div style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    padding: '20px 40px',
                    borderRadius: 15,
                    color: 'white',
                    fontSize: 40,
                    fontFamily: 'sans-serif',
                    opacity: interpolate(frame, [0, 20], [0, 1])
                }}>
                    {scene.text}
                </div>
            </AbsoluteFill>
            {scene.audio && <Audio src={staticFile(scene.audio)} />}
        </AbsoluteFill>
    );
};
