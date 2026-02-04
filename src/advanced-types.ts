import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

// Asset Types
export const AssetTypeSchema = z.enum(['video', 'image', 'audio', 'text']);

// Base Asset Schema
export const BaseAssetSchema = z.object({
    id: z.string(),
    startFrame: z.number().min(0),
    durationInFrames: z.number().min(1),
    layer: z.number().default(0), // 0: Background, 1: Content, 2: Overlay
    transition: z.object({
        type: z.enum(['fade', 'slide', 'wipe', 'none']).default('none'),
        durationInFrames: z.number().min(0).default(15),
    }).optional(),
});

// Specific Asset Schemas
export const VideoAssetSchema = BaseAssetSchema.extend({
    type: z.literal('video'),
    src: z.string(),
    volume: z.number().min(0).max(1).default(1),
    muted: z.boolean().default(false),
});

export const ImageAssetSchema = BaseAssetSchema.extend({
    type: z.literal('image'),
    src: z.string(),
    style: z.object({
        borderRadius: z.number().optional(),
        filter: z.string().optional(),
    }).optional(),
    animation: z.object({
        type: z.enum(['static', 'ken-burns', 'pan', 'zoom', 'shake']),
        direction: z.enum(['in', 'out', 'left', 'right', 'up', 'down', 'random']).optional(),
        intensity: z.enum(['subtle', 'medium', 'dramatic']).optional(),
        speed: z.number().optional().describe("Animation speed multiplier"),
    }).optional(),
});

export const AudioAssetSchema = BaseAssetSchema.extend({
    type: z.literal('audio'),
    src: z.string(),
    volume: z.number().min(0).max(1).default(1),
});

export const TextAssetSchema = BaseAssetSchema.extend({
    type: z.literal('text'),
    text: z.string(),
    fontSize: z.number().default(40),
    color: zColor().default('#ffffff'),
    x: z.number().default(50), // Percentage
    y: z.number().default(50), // Percentage
});

// Union of all assets
// Caption Asset
export const CaptionAssetSchema = BaseAssetSchema.extend({
    type: z.literal('caption'),
    style: z.object({
        fontSize: z.number().default(60),
        color: z.string().default('#ffffff'),
        fontFamily: z.string().default('sans-serif'),
        animation: z.enum(['pop', 'fade', 'karaoke', 'none']).default('pop'),
    }),
    segments: z.array(z.object({
        text: z.string(),
        startMs: z.number(), // Relative to the start of the asset
        endMs: z.number(),
    })),
});

// Walking Scene Asset
export const WalkingSceneAssetSchema = BaseAssetSchema.extend({
    type: z.literal('walking-scene'),
    src: z.string(),
    text: z.string(),
});

export const TimelineAssetSchema = z.discriminatedUnion('type', [
    VideoAssetSchema,
    ImageAssetSchema,
    AudioAssetSchema,
    TextAssetSchema,
    CaptionAssetSchema,
    WalkingSceneAssetSchema,
]);

// Main Composition Schema
export const EditorSchema = z.object({
    title: z.string(),
    width: z.number().default(1920),
    height: z.number().default(1080),
    fps: z.number().default(30),
    backgroundMusic: z.object({
        src: z.string().optional(),
        volume: z.number().min(0).max(1).default(0.5),
        loop: z.boolean().default(true),
    }).optional(),
    tracks: z.array(TimelineAssetSchema).describe("Timeline Tracks"),
});

export type EditorConfig = z.infer<typeof EditorSchema>;
export type TimelineAsset = z.infer<typeof TimelineAssetSchema>;
export type CaptionAsset = z.infer<typeof CaptionAssetSchema>;
export type WalkingSceneAsset = z.infer<typeof WalkingSceneAssetSchema>;
