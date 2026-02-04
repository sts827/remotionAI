import React, { useState, useEffect } from 'react';
import { continueRender, delayRender } from 'remotion';
import { AudioVisualizer } from './AudioVisualizer';

interface SafeAudioVisualizerProps extends React.ComponentProps<typeof AudioVisualizer> {
}

export const SafeAudioVisualizer: React.FC<SafeAudioVisualizerProps> = (props) => {
    const [handle] = useState(() => delayRender());
    const [exists, setExists] = useState<boolean | null>(null);

    useEffect(() => {
        if (!props.src) {
            setExists(false);
            continueRender(handle);
            return;
        }

        // Check if file exists using simple fetch
        fetch(props.src, { method: 'HEAD' })
            .then((res) => {
                if (res.ok) {
                    setExists(true);
                } else {
                    console.warn(`[SafeAudioVisualizer] Audio file not found: ${props.src}, skipping visualizer.`);
                    setExists(false);
                }
            })
            .catch(() => {
                console.warn(`[SafeAudioVisualizer] Error checking audio file: ${props.src}, skipping visualizer.`);
                setExists(false);
            })
            .finally(() => {
                continueRender(handle);
            });
    }, [props.src, handle]);

    if (exists === null) {
        return null; // Loading state
    }

    if (!exists) {
        return null; // File missing -> Render nothing
    }

    return <AudioVisualizer {...props} />;
};
