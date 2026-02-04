import { IImageGenerator } from '../types';

export class GeminiImageAdapter implements IImageGenerator {
    private apiKey: string;
    private modelName: string;

    constructor(apiKey: string, modelName?: string) {
        this.apiKey = apiKey;
        this.modelName = modelName || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
    }

    async generateImage(prompt: string, style?: string): Promise<ArrayBuffer> {
        console.log(`[GeminiImage] Generating image with model: ${this.modelName} for: "${prompt}"`);

        if (!this.apiKey) {
            throw new Error("Gemini Image API Key is required");
        }

        // Endpoint for Imagen 3 / Gemini Image
        // Note: For 'gemini-2.5-flash-image', likely uses generateContent with image output
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

        const payload = {
            contents: [{
                parts: [{ text: `Generate a photorealistic image: ${prompt} ${style ? 'Style: ' + style : ''}` }]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                candidateCount: 1
                // aspectRatio: "16:9" // Check if API supports this in generationConfig, otherwise put in prompt
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
                throw new Error(`Gemini Image API Error: ${response.status} - ${errText}`);
            }

            const data = await response.json();

            // Expected response for image generation: candidates[0].content.parts[0].inlineData.data (like TTS? or unique?)
            // Imagen on Vertex returns bytesBase64. Gemini API usually follows uniform structure.
            const base64Image = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

            if (!base64Image) {
                console.error("Full Response:", JSON.stringify(data, null, 2));
                throw new Error("No image data found in Gemini response");
            }

            // Convert Base64 to ArrayBuffer using Node.js Buffer
            const buffer = Buffer.from(base64Image, 'base64');

            // Return unique ArrayBuffer slice
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

        } catch (error) {
            console.error("[GeminiImage] Generation failed:", error);
            throw error;
        }
    }
}
