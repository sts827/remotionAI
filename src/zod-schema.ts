import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const AICompositionSchema = z.object({
    title: z.string().describe("비디오 제목"),
    primaryColor: zColor().describe("메인 컬러"),
    scenes: z.array(
        z.object({
            id: z.string(),
            type: z.enum(['walking-in', 'static', 'pan']),
            durationInFrames: z.number().min(30).max(300),
            text: z.string().describe("자막 텍스트"),
            image: z.string().describe("배경 이미지/영상 경로"),
            audio: z.string().optional().describe("오디오 경로")
        })
    ).describe("장면 목록")
});
