import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { Groq } from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Initialize Groq implicitly from process.env.GROQ_API_KEY
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

async function extractSubtitlesWithYtDlp(url: string): Promise<string> {
    const tmpDir = os.tmpdir();
    const prefix = `yt_sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const outTemplate = path.join(tmpDir, `${prefix}.%(ext)s`);

    try {
        await execPromise(
            `yt-dlp --skip-download --write-auto-sub --write-sub --sub-lang "en.*,en" --sub-format vtt -o "${outTemplate}" "${url}"`,
            { timeout: 25000 }
        );

        const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(prefix) && f.endsWith('.vtt'));
        if (files.length > 0) {
            const vttPath = path.join(tmpDir, files[0]);
            const content = fs.readFileSync(vttPath, 'utf8');
            try { fs.unlinkSync(vttPath); } catch {}

            const lines = content.split(/\r?\n/);
            const textLines: string[] = [];
            for (let line of lines) {
                line = line.trim();
                if (!line || line.includes('-->') || line.startsWith('WEBVTT') || line.startsWith('Kind:') || line.startsWith('Language:')) {
                    continue;
                }
                const cleaned = line.replace(/<[^>]+>/g, '').trim();
                if (cleaned && (textLines.length === 0 || textLines[textLines.length - 1] !== cleaned)) {
                    textLines.push(cleaned);
                }
            }
            return textLines.join(' ');
        }
    } catch (e: any) {
        console.warn("[yt-dlp Subtitles] Could not extract subtitles:", e?.message);
    }
    return "";
}

async function transcribeVideoOffline(url: string, videoId: string) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
    const groqKey = process.env.GROQ_API_KEY || "";

    console.log(`[Transcription Pipeline] Forwarding transcription request to Backend for ${videoId}...`);
    
    const res = await fetch(`${backendUrl}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url, groq_key: groqKey })
    });
    
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Backend transcription failed: ${err}`);
    }
    
    const data = await res.json();
    if (!data.text) throw new Error("Backend returned empty transcript text.");
    
    return data.text;
}

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });

        let videoId = url;
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname.includes('youtube.com')) {
                videoId = urlObj.searchParams.get('v') || url;
            } else if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            }
        } catch (e) {}

        let transcriptText = "";
        try {
            // Plan A: Native YouTube timedtext fetch
            console.log(`[API] Attempting native YouTube transcript fetch for ${videoId}...`);
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            transcriptText = transcript.map(t => t.text).join(' ').trim();
            if (!transcriptText || transcriptText.length < 10) {
                 throw new Error("Transcript is essentially empty or disabled.");
            }
        } catch (ytError) {
             // Plan B: Direct local yt-dlp Subtitle extractor
             console.log(`[API] Standard fetch failed/blocked. Attempting local yt-dlp subtitle extraction for ${videoId}...`);
             try {
                 transcriptText = await extractSubtitlesWithYtDlp(url);
             } catch (subError) {
                 console.warn("[API] Local yt-dlp subtitle fetch error:", subError);
             }

             // Plan C: Python Backend / Whisper Bypass
             if (!transcriptText || transcriptText.length < 10) {
                 console.log(`[API] Subtitles not found. Activating Backend Transcription for ${videoId}...`);
                 try {
                     transcriptText = await transcribeVideoOffline(url, videoId);
                     console.log(`[API] Bypass successful! Transcription completed via Backend.`);
                 } catch (bypassError: any) {
                     console.error("[API] Backend Bypass also failed:", bypassError?.message || bypassError);
                     transcriptText = "Transcript extraction failed. Please check if the video has restricted access or is private.";
                 }
             }
        }

        return NextResponse.json({ text: transcriptText });
    } catch (error: any) {
        console.error("YouTube Pipeline Error:", error);
        return NextResponse.json({ error: error?.message || 'Failed to fetch or generate transcript.' }, { status: 500 });
    }
}
