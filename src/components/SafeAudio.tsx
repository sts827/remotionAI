import React, { useState, useEffect } from 'react';
import { Audio, staticFile, continueRender, delayRender } from 'remotion';

interface SafeAudioProps extends React.ComponentProps<typeof Audio> {
    // Add any custom props if needed
}

export const SafeAudio: React.FC<SafeAudioProps> = (props) => {
    const [handle] = useState(() => delayRender());
    const [exists, setExists] = useState<boolean | null>(null);

    useEffect(() => {
        if (!props.src) {
            setExists(false);
            continueRender(handle);
            return;
        }

        // Check if file exists using simple fetch
        // staticFile wraps the path, so we use it directly
        // Note: staticFile returns string.
        const src = props.src;

        fetch(src, { method: 'HEAD' })
            .then((res) => {
                if (res.ok) {
                    setExists(true);
                } else {
                    console.warn(`[SafeAudio] Audio file not found: ${src}, playing silence.`);
                    setExists(false);
                }
            })
            .catch(() => {
                console.warn(`[SafeAudio] Error checking audio file: ${src}, playing silence.`);
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
        return null; // File missing -> Play silence (render nothing)
    }

    return <Audio {...props} />;
};
