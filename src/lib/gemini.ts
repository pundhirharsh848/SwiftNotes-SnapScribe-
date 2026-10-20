import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Candidate models ordered by reliability, low-quota footprint, and free-tier limits.
 * We fall back automatically across models so 429 quota exhaustion on one model
 * (like the 20 req/day limit on gemini-3.8-flash) doesn't break the user experience.
 */
export const GEMINI_CANDIDATE_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash"
];

export interface GenerateFallbackOptions {
    generationConfig?: any;
    systemInstruction?: string;
}

export async function generateWithFallback(
    genAI: GoogleGenerativeAI,
    prompt: string | any,
    options?: GenerateFallbackOptions
) {
    let lastError: any = null;

    for (const modelName of GEMINI_CANDIDATE_MODELS) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: options?.generationConfig,
                systemInstruction: options?.systemInstruction,
            });

            const result = await model.generateContent(prompt);
            return { result, modelName };
        } catch (err: any) {
            console.warn(`[Gemini Fallback] Model '${modelName}' failed: ${err?.message || err}. Trying next model...`);
            lastError = err;
        }
    }

    throw lastError || new Error("All candidate Gemini models failed.");
}
