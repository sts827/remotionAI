export type SceneType = 'walking-in' | 'static' | 'pan';

export interface Scene {
    id: string;
    type: SceneType;
    durationInFrames: number;
    text: string;
    image: string;
    audio?: string;
}

export interface VideoConfig {
    title: string;
    scenes: Scene[];
}
