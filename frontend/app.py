from __future__ import annotations

import os
from typing import Any

import gradio as gr
import httpx


BASE_URL = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")
REQUEST_TIMEOUT = 20


def _render_sources(sources: list[dict[str, Any]]) -> str:
    if not sources:
        return "_No sources available._"
    lines: list[str] = []
    for src in sources[:5]:
        title = src.get("page_title", "Source")
        url = src.get("source_url", "#")
        lines.append(f"- [{title}]({url})")
    return "\n".join(lines)


def respond(message: str, history: list[tuple[str, str]]) -> str:
    _ = history
    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            res = client.post(f"{BASE_URL}/chat", json={"query": message})
            res.raise_for_status()
        payload = res.json()
        answer = payload.get("answer", "No answer returned.")
        mode = payload.get("mode", "unknown")
        sources_md = _render_sources(payload.get("sources", []))
        return f"{answer}\n\n**Mode:** `{mode}`\n\n**Sources**\n{sources_md}"
    except httpx.TimeoutException:
        return (
            "The assistant is taking longer than expected right now. "
            "Please retry in a few seconds."
        )
    except Exception as exc:
        return f"Service temporarily unavailable: {exc}"


examples = [
    "What are the admission requirements for MBA?",
    "When is the last date to apply for PhD 2026?",
    "What scholarships are available for Kashmir students?",
    "How do I contact the examination department?",
]

with gr.Blocks(title="CUK Assistant") as demo:
    gr.Markdown(
        "## CUK Assistant — Central University of Kashmir AI Help Desk\n"
        "Ask about admissions, courses, exam schedules, notices & more"
    )

    gr.ChatInterface(
        fn=respond,
        chatbot=gr.Chatbot(height=500),
        textbox=gr.Textbox(placeholder="Type your question here..."),
        examples=examples,
    )

    gr.Markdown("`Powered by FAISS + Exa | No OpenAI`")


if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=int(os.getenv("PORT", "7860")),
        theme=gr.themes.Soft(),
    )
