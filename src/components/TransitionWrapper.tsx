import React from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import { TimelineAsset } from '../advanced-types';
import { AbsoluteFill, Sequence } from 'remotion';

interface TransitionWrapperProps {
    assets: TimelineAsset[];
    mergedComponent: React.FC<{ asset: TimelineAsset }>;
}

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({ assets, mergedComponent: Component }) => {
    // Only apply transitions to visual assets (video/image) on the MAIN layer (e.g. layer 0)
    // Multitrack transitions are complex; we will simplify by sequencing layer 0 assets.

    // Filter for visual assets on layer 0 (background/main content)
    const trackAssets = assets
        .filter(a => (a.type === 'video' || a.type === 'image') && a.layer === 0)
        .sort((a, b) => a.startFrame - b.startFrame);

    if (trackAssets.length === 0) return null;

    return (
        <TransitionSeries>
            {trackAssets.map((asset, index) => {
                const nextAsset = trackAssets[index + 1];

                // Default props
                const durationInFrames = asset.durationInFrames;

                // Determine transition to NEXT slide
                // Use the transition definition of the CURRENT slide to exit, 
                // OR technically usually transitions are "between" A and B.
                // Let's assume asset.transition defines how it ENTERS or EXITS.
                // Simpler: Use standard linear sequence with Transitions.

                const transitionType = asset.transition?.type || 'none';
                const transitionDuration = asset.transition?.durationInFrames || 15;

                const getPresentation = () => {
                    switch (transitionType) {
                        case 'slide': return slide();
                        case 'fade': return fade();
                        case 'wipe': return wipe();
                        default: return fade();
                    }
                };

                return (
                    <React.Fragment key={asset.id}>
                        <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                            <Component asset={asset} />
                        </TransitionSeries.Sequence>

                        {/* Apply Transition if there is a next asset */}
                        {nextAsset && transitionType !== 'none' && (
                            <TransitionSeries.Transition
                                presentation={getPresentation() as any}
                                timing={linearTiming({ durationInFrames: transitionDuration })}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </TransitionSeries>
    );
};
