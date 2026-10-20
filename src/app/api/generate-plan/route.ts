import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateWithFallback } from '@/lib/gemini';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { examDate, topics, weakAreas, studySpeed } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            console.warn("GEMINI_API_KEY missing, returning mock plan data.");
            return NextResponse.json({
                plan: [
                    { date: "Day 1 (Mock)", learning: ["Introduction to " + topics], review: [] },
                    { date: "Day 2 (Mock)", learning: ["Deep dive into " + topics], review: ["Introduction to " + topics] },
                    { date: "Day 3 (Mock)", learning: ["Advanced applications"], review: ["Deep dive into " + topics, weakAreas || 'None specified'] },
                ],
                summary: "This is a mock AI schedule since the GEMINI_API_KEY is missing from your environment. Add your API key to `.env.local` to generate real personalized spaced-repetition timelines!"
            });
        }

        if (!examDate || !topics) {
            return NextResponse.json({ error: 'Exam Date and Topics are required' }, { status: 400 });
        }

        const prompt = `Act as an expert study planner and scheduling AI. Create a highly optimized, daily spaced-repetition revision plan.
User's constraints:
- Exam Date: ${examDate}
- Topics to cover (with optional weightage/priority): ${topics}
- Weak areas (needs extra repetition): ${weakAreas || 'None specified'}
- Study Speed: ${studySpeed || 'Medium'}

Generate a structured daily revision plan starting from tomorrow, ending on the exam date. Group the workload logically. Incorporate spaced repetition (learn a topic, review it 2 days later, review it 1 week later). For weak areas, increase review frequency.
Return ONLY valid JSON text in the following structure, with NO markdown ticks or extra formatting:

{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "learning": ["Topic A", "Topic B"],
      "review": ["Topic C (from previous days)"]
    }
  ],
  "summary": "Short encouraging paragraph about the strategy employed."
}
`;

        let jsonText = "";
        try {
            const { result } = await generateWithFallback(genAI, prompt);
            jsonText = result.response.text().trim();
        } catch (apiErr: any) {
            console.warn("All Gemini models rate-limited or unavailable, creating fallback study schedule:", apiErr?.message);
            // Graceful fallback schedule when quota is reached
            const rawTopics = topics.split(/[,;\n]+/).map((t: string) => t.trim()).filter(Boolean);
            const topicList = rawTopics.length > 0 ? rawTopics : [topics];
            const plan = [];
            const startDate = new Date();
            const exam = new Date(examDate);
            const diffDays = Math.max(1, Math.min(14, Math.round((exam.getTime() - startDate.getTime()) / (1000 * 3600 * 24))));
            
            for (let i = 1; i <= diffDays; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const learnIdx = (i - 1) % topicList.length;
                const learn = [topicList[learnIdx]];
                const review: string[] = [];
                if (i > 1) {
                    review.push(topicList[(i - 2) % topicList.length]);
                }
                if (weakAreas && i % 2 === 0) {
                    review.push(`Deep Review: ${weakAreas}`);
                }
                plan.push({ date: dateStr, learning: learn, review });
            }

            return NextResponse.json({
                plan,
                summary: `Custom spaced-repetition plan generated for ${topics}. (Notice: Gemini API quota was temporarily reached on free-tier, so an adaptive algorithm built your schedule seamlessly!)`
            });
        }

        // Strip markdown code fences if present
        if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
        }

        try {
            const parsed = JSON.parse(jsonText);
            return NextResponse.json(parsed);
        } catch (parseError) {
            console.error("AI returned malformed JSON:", jsonText);
            return NextResponse.json({ error: "AI failed to generate structural JSON." }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Planner Generation Error:", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
