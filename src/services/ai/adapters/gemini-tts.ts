import { ITTSGenerator } from '../types';

export class GeminiTTSAdapter implements ITTSGenerator {
    private apiKey: string;
    private modelName: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.modelName = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
    }

    async generateSpeech(text: string, voiceId?: string): Promise<{
        audio: ArrayBuffer;
        wordTimings?: Array<{ word: string, start: number, end: number }>;
    }> {
        console.log(`[GeminiTTS] Generating speech with model: ${this.modelName}`);

        if (!this.apiKey) {
            throw new Error("Gemini API Key is required for TTS");
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

        const payload = {
            contents: [{
                parts: [{ text: text }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voiceId || "Kore" // Default to 'Kore' if not provided
                        }
                    }
                }
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini TTS API Error: ${response.status} ${response.statusText} - ${errText}`);
            }

            const data = await response.json();

            // Extract base64 audio from: candidates[0].content.parts[0].inlineData.data
            const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!base64Audio) {
                console.error("Full Response:", JSON.stringify(data, null, 2));
                throw new Error("No audio data found in Gemini response");
            }

            // Convert Base64 to ArrayBuffer using Node.js Buffer
            const buffer = Buffer.from(base64Audio, 'base64');

            // Return unique ArrayBuffer slice to ensure compatibility
            return { audio: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) };

        } catch (error) {
            console.error("[GeminiTTS] Generation failed:", error);
            throw error;
        }
    }
}
