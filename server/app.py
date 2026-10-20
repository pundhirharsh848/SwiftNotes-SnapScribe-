import os
import sys
import json
import uuid
import base64
import subprocess
import threading
import tempfile
import re
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests

# Try to import Google Generative AI
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

# Try to import reportlab for PDF generation
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib import colors
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

# Load environment variables from .env.local if present
def load_env_local():
    curr = Path(__file__).resolve().parent
    for p in [curr / ".env.local", curr.parent / ".env.local", curr / ".env", curr.parent / ".env"]:
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k not in os.environ:
                            os.environ[k] = v

load_env_local()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

if HAS_GENAI and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="SwiftNotes AI Backend", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static dir for generated PDFs
STATIC_DIR = Path(__file__).resolve().parent / "static"
PDF_DIR = STATIC_DIR / "pdfs"
PDF_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Task status tracker for PDF generation
TASKS: Dict[str, Dict[str, Any]] = {}

# ----------------- Models -----------------
class TranscribeRequest(BaseModel):
    url: str
    groq_key: Optional[str] = None

class ExtractRequest(BaseModel):
    url: str

class PlaylistInfoRequest(BaseModel):
    url: str

class VideoItem(BaseModel):
    url: str
    title: str

class CustomPdfRequest(BaseModel):
    title: Optional[str] = "Playlist Study Guide"
    videos: List[VideoItem]

class PlaylistPdfRequest(BaseModel):
    url: str

class TranscriptItem(BaseModel):
    title: str
    text: str
    url: Optional[str] = None

class MultiVideoAnalysisRequest(BaseModel):
    transcripts: List[TranscriptItem]
    query: str

class SnapshotRequest(BaseModel):
    url: str
    seconds: float

# ----------------- Helper Functions -----------------
def extract_video_id(url: str) -> str:
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    return match.group(1) if match else url

def fetch_subtitles_ytdlp(url: str) -> str:
    """Extract subtitles using yt-dlp auto-sub directly"""
    with tempfile.TemporaryDirectory() as tmpdir:
        out_template = os.path.join(tmpdir, "sub.%(ext)s")
        cmd = [
            "yt-dlp",
            "--skip-download",
            "--write-auto-sub",
            "--write-sub",
            "--sub-lang", "en.*,en",
            "--sub-format", "vtt",
            "-o", out_template,
            url
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            vtt_files = list(Path(tmpdir).glob("*.vtt"))
            if vtt_files:
                content = vtt_files[0].read_text(encoding="utf-8", errors="ignore")
                lines = []
                for line in content.splitlines():
                    line = line.strip()
                    if not line or "-->" in line or line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
                        continue
                    cleaned = re.sub(r"<[^>]+>", "", line)
                    if cleaned and (not lines or lines[-1] != cleaned):
                        lines.append(cleaned)
                return " ".join(lines)
        except Exception as e:
            print(f"yt-dlp subtitle extraction error: {e}")
    return ""

def call_gemini_model(prompt: str) -> str:
    """Call Google Gemini model using modern google.genai SDK or REST API"""
    api_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY)
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured.")
    
    candidate_models = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.8-flash"]
    
    try:
        from google import genai as google_genai
        client = google_genai.Client(api_key=api_key)
        for model_name in candidate_models:
            try:
                resp = client.models.generate_content(model=model_name, contents=prompt)
                if resp and resp.text:
                    return resp.text
            except Exception as e:
                print(f"google.genai {model_name} failed: {e}")
                continue
    except Exception as e:
        print(f"Could not initialize modern google.genai: {e}")

    # Fallback to direct REST API
    for model_name in candidate_models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            res = requests.post(url, json=payload, timeout=60)
            if res.ok:
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"REST Gemini {model_name} failed: {e}")
            continue

    raise HTTPException(status_code=500, detail="All Gemini model calls failed.")

# ----------------- Routes -----------------

@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "SwiftNotes Backend",
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY", GEMINI_API_KEY)),
        "groq_configured": bool(os.getenv("GROQ_API_KEY", GROQ_API_KEY))
    }

@app.post("/transcribe")
def transcribe_video(req: TranscribeRequest):
    """Transcribes a YouTube video using yt-dlp subtitles or Groq fallback"""
    text = fetch_subtitles_ytdlp(req.url)
    if text and len(text) > 20:
        return {"text": text}

    # If no subtitles, check if Groq key is provided
    groq_key = req.groq_key or os.getenv("GROQ_API_KEY", GROQ_API_KEY)
    if groq_key:
        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = os.path.join(tmpdir, "audio.m4a")
            cmd = [
                "yt-dlp",
                "-x",
                "--audio-format", "m4a",
                "-o", audio_path,
                req.url
            ]
            subprocess.run(cmd, capture_output=True, timeout=90)
            if os.path.exists(audio_path):
                with open(audio_path, "rb") as f:
                    r = requests.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {groq_key}"},
                        files={"file": ("audio.m4a", f, "audio/m4a")},
                        data={"model": "whisper-large-v3", "response_format": "json"},
                        timeout=90
                    )
                    if r.ok:
                        return {"text": r.json().get("text", "")}

    if not text:
        raise HTTPException(status_code=400, detail="Could not extract subtitles for this video.")
    return {"text": text}

@app.post("/extract")
def extract_ai_notes(req: ExtractRequest):
    """
    Map-Reduce AI Notes Generation:
    Extracts transcript and outputs summary, flashcards, cheatsheet, formulae, and theory.
    """
    transcript = fetch_subtitles_ytdlp(req.url)
    if not transcript:
        # Fallback to video metadata if subtitles are unavailable
        try:
            res = subprocess.run(["yt-dlp", "--dump-json", req.url], capture_output=True, text=True, timeout=20)
            if res.ok and res.stdout:
                info = json.loads(res.stdout)
                transcript = f"Title: {info.get('title', '')}\nDescription: {info.get('description', '')}"
        except Exception:
            pass

    if not transcript or len(transcript) < 20:
        raise HTTPException(status_code=400, detail="Unable to extract video subtitles or transcript.")

    prompt = f"""
You are an expert educational researcher and study assistant for SwiftNotes.
Analyze the following YouTube video transcript and generate comprehensive, well-structured study notes formatted in GitHub Markdown with KaTeX math formatting ($...$ and $$...$$).

Return ONLY a valid JSON object with the following 5 exact keys (no markdown formatting around the JSON, just raw JSON):
{{
  "summary": "Detailed, highly insightful multi-paragraph overview and main points...",
  "flashcards": "A list of 6-10 high-yield flashcards in Q&A format...",
  "cheatsheet": "A quick reference bulleted list of essential concepts, terms, and rules...",
  "formulae": "Key formulas, mathematical representations, equations, and rules (use LaTeX $...$)...",
  "theory": "Deep-dive conceptual explanation covering the core theoretical mechanisms and foundational principles..."
}}

VIDEO TRANSCRIPT:
{transcript[:30000]}
"""

    response_text = call_gemini_model(prompt).strip()
    
    first_brace = response_text.find("{")
    last_brace = response_text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_candidate = response_text[first_brace:last_brace+1]
        try:
            return json.loads(json_candidate)
        except Exception:
            pass

    # Strip markdown code blocks if Gemini enclosed the response in ```json ... ```
    cleaned = re.sub(r"^```(?:json)?\s*", "", response_text)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except Exception as e:
        return {
            "summary": response_text,
            "flashcards": "Could not format flashcards separately.",
            "cheatsheet": "Could not format cheatsheet separately.",
            "formulae": "Could not format formulae separately.",
            "theory": response_text
        }

@app.post("/playlist-info")
def get_playlist_info(req: PlaylistInfoRequest):
    """Fetches video list and playlist title using yt-dlp"""
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--dump-single-json",
        req.url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=40)
    if res.returncode != 0:
        raise HTTPException(status_code=400, detail="Failed to fetch playlist information.")
    
    data = json.loads(res.stdout)
    title = data.get("title", "YouTube Playlist")
    raw_entries = data.get("entries", [])
    
    videos = []
    for entry in raw_entries:
        if not entry:
            continue
        v_id = entry.get("id")
        v_title = entry.get("title", "Untitled Video")
        v_url = entry.get("url") or f"https://www.youtube.com/watch?v={v_id}"
        videos.append({"id": v_id, "title": v_title, "url": v_url})

    return {"title": title, "videos": videos}

@app.post("/multi-video-analysis")
def multi_video_analysis(req: MultiVideoAnalysisRequest):
    """Synthesizes insights across multiple transcripts based on user query"""
    combined_ctx = ""
    for item in req.transcripts:
        combined_ctx += f"\n\n### Video: {item.title}\n{item.text[:6000]}"

    prompt = f"""
You are an expert tutor synthesizing information from multiple educational videos.
Answer the following user query thoroughly based on the provided video transcripts.

USER QUERY:
{req.query}

VIDEO TRANSCRIPTS:
{combined_ctx}
"""
    answer = call_gemini_model(prompt)
    return {"text": answer}

@app.post("/snapshot")
def get_video_snapshot(req: SnapshotRequest):
    """Extracts a real high-res video frame at a specific timestamp using yt-dlp and ffmpeg"""
    try:
        # Get streaming URL from yt-dlp
        res = subprocess.run([
            "yt-dlp",
            "-f", "bestvideo[height<=720]+bestaudio/best",
            "-g",
            "--no-playlist",
            req.url
        ], capture_output=True, text=True, timeout=20)
        
        if res.returncode != 0 or not res.stdout.strip():
            raise Exception("Failed to get video stream URL")
        
        stream_url = res.stdout.strip().split("\n")[0]
        
        # Use ffmpeg to extract 1 frame to stdout
        ffmpeg_cmd = [
            "ffmpeg",
            "-ss", str(req.seconds),
            "-i", stream_url,
            "-vframes", "1",
            "-q:v", "3",
            "-f", "image2",
            "pipe:1"
        ]
        
        frame_proc = subprocess.run(ffmpeg_cmd, capture_output=True, timeout=15)
        if frame_proc.returncode != 0 or not frame_proc.stdout:
            raise Exception("FFmpeg frame capture failed")
        
        b64 = base64.b64encode(frame_proc.stdout).decode("utf-8")
        return {"frameBase64": f"data:image/jpeg;base64,{b64}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_pdf_task(task_id: str, title: str, videos: List[Dict[str, str]]):
    """Background worker to create study guide PDF"""
    try:
        TASKS[task_id] = {"status": "Starting analysis...", "progress": 10}
        total = len(videos)
        
        doc_path = PDF_DIR / f"{task_id}.pdf"
        
        if not HAS_REPORTLAB:
            TASKS[task_id] = {"status": "Error: ReportLab not installed", "progress": 0}
            return

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#1E293B'), spaceAfter=14)
        h2_style = ParagraphStyle('H2Style', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#2563EB'), spaceBefore=12, spaceAfter=6)
        body_style = ParagraphStyle('BodyStyle', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=8)

        story = []
        story.append(Paragraph(f"SwiftNotes Study Guide: {title}", title_style))
        story.append(Spacer(1, 12))

        for idx, v in enumerate(videos):
            TASKS[task_id] = {
                "status": f"Processing video {idx+1}/{total}: {v.get('title', '')[:30]}...",
                "progress": 10 + int((idx / total) * 80)
            }
            
            transcript = fetch_subtitles_ytdlp(v.get("url", ""))
            if transcript:
                summary_prompt = f"Summarize the key points and concepts of this video in 2-3 concise paragraphs:\nTitle: {v.get('title')}\nTranscript: {transcript[:10000]}"
                try:
                    summary = call_gemini_model(summary_prompt)
                except Exception:
                    summary = "Summary generation unavailable."
            else:
                summary = "Transcript not available for this video."

            story.append(Paragraph(f"{idx+1}. {v.get('title', 'Video')}", h2_style))
            # Clean markdown formatting for basic PDF paragraph
            clean_summary = summary.replace("#", "").replace("*", "").replace("\n", "<br/>")
            story.append(Paragraph(clean_summary, body_style))
            story.append(Spacer(1, 10))

        doc = SimpleDocTemplate(str(doc_path), pagesize=letter)
        doc.build(story)

        TASKS[task_id] = {
            "status": "Complete",
            "progress": 100,
            "pdf_url": f"/static/pdfs/{task_id}.pdf"
        }
    except Exception as e:
        print(f"PDF Task Error: {e}")
        TASKS[task_id] = {"status": f"Error: {str(e)}", "progress": 0}

@app.post("/custom-pdf")
def create_custom_pdf(req: CustomPdfRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    TASKS[task_id] = {"status": "Queued", "progress": 5}
    video_dicts = [{"url": v.url, "title": v.title} for v in req.videos]
    background_tasks.add_task(generate_pdf_task, task_id, req.title or "Study Guide", video_dicts)
    return {"task_id": task_id}

@app.post("/playlist-pdf")
def create_playlist_pdf(req: PlaylistPdfRequest, background_tasks: BackgroundTasks):
    info = get_playlist_info(PlaylistInfoRequest(url=req.url))
    task_id = str(uuid.uuid4())
    TASKS[task_id] = {"status": "Queued", "progress": 5}
    background_tasks.add_task(generate_pdf_task, task_id, info.get("title", "Playlist"), info.get("videos", []))
    return {"task_id": task_id}

@app.get("/status/{task_id}")
def get_task_status(task_id: str):
    if task_id in TASKS:
        return TASKS[task_id]
    return {"status": "Task not found", "progress": 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
