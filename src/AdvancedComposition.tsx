import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, Video, staticFile } from 'remotion';
import { EditorConfig, TimelineAsset } from './advanced-types';
import { z } from 'zod';
import { EditorSchema } from './advanced-types';
import { TransitionWrapper } from './components/TransitionWrapper';
import { AudioVisualizer } from './components/AudioVisualizer';
import { CaptionLayer } from './components/CaptionLayer';
import { KenBurnsImage } from './components/KenBurnsImage';
import { MotionImage } from './components/MotionImage';
import { WalkingScene } from './components/WalkingScene';
import { SafeAudio } from './components/SafeAudio';
import { SafeAudioVisualizer } from './components/SafeAudioVisualizer';

export const AdvancedComposition: React.FC<z.infer<typeof EditorSchema>> = (props) => {
    // 1. Separate assets: Main Content (Layer 0) vs Overlays (Others)
    const transitionAssets = props.tracks.filter(a => a.layer === 0).sort((a, b) => a.startFrame - b.startFrame);
    const overlayAssets = props.tracks.filter(a => a.layer !== 0).sort((a, b) => a.layer - b.layer);

    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            {/* Background Music (Global) */}
            {props.backgroundMusic && props.backgroundMusic.src && (
                <>
                    <SafeAudio
                        src={staticFile(props.backgroundMusic.src)}
                        volume={props.backgroundMusic.volume}
                        loop={props.backgroundMusic.loop}
                    />
                    {/* Audio Visualizer (Layer 100 - Top) */}
                    <SafeAudioVisualizer
                        src={staticFile(props.backgroundMusic.src)}
                        barWidth={8}
                        gap={4}
                        color={(props.tracks.find(t => t.type === 'text') as any)?.color || '#00ffcc'}
                    />
                </>
            )}

            {/* Layer 0: Main Content with Transitions */}
            {transitionAssets.length > 0 ? (
                <TransitionWrapper
                    assets={transitionAssets}
                    mergedComponent={AssetRenderer}
                />
            ) : null}

            {/* Other Layers: Overlays (Text, pip, etc) */}
            {overlayAssets.map((asset) => {
                return (
                    <Sequence
                        key={asset.id}
                        name={asset.id} // Label in Timeline
                        from={asset.startFrame}
                        durationInFrames={asset.durationInFrames}
                        style={{ zIndex: asset.layer }} // Basic z-index handling
                    >
                        <AssetRenderer asset={asset} />
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};

const AssetRenderer: React.FC<{ asset: TimelineAsset }> = ({ asset }) => {
    switch (asset.type) {
        case 'video':
            return (
                <Video
                    src={staticFile(asset.src)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    volume={asset.volume}
                    muted={asset.muted}
                />
            );
        case 'image':
            // Use the new generic MotionImage for all image types (including static, ken-burns, pan, zoom, shake)
            return (
                <MotionImage
                    src={staticFile(asset.src)}
                    animation={asset.animation as any} // Cast safely as we verified types in schema
                    style={{
                        borderRadius: asset.style?.borderRadius,
                        filter: asset.style?.filter,
                    }}
                />
            );
        case 'audio':
            return (
                <SafeAudio
                    src={staticFile(asset.src)}
                    volume={asset.volume}
                />
            );
        case 'text':
            return (
                <AbsoluteFill style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    pointerEvents: 'none' // Let clicks pass through
                }}>
                    <div style={{
                        position: 'absolute',
                        left: `${asset.x}%`,
                        top: `${asset.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: asset.fontSize,
                        color: asset.color,
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                        textAlign: 'center'
                    }}>
                        {asset.text}
                    </div>
                </AbsoluteFill>
            );

        case 'caption':
            return <CaptionLayer asset={asset} />;
        case 'walking-scene':
            // Adapter for WalkingScene component
            // WalkingScene expects a 'Scene' object { id, type, durationInFrames, text, image, audio? }
            return (
                <WalkingScene
                    scene={{
                        id: asset.id,
                        type: 'walking-in', // Force type for layout
                        durationInFrames: asset.durationInFrames,
                        text: asset.text,
                        image: asset.src,
                        audio: undefined // Audio handled by separate track
                    }}
                />
            );
        default:
            return null;
    }
};
