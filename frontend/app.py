from __future__ import annotations

import os
from typing import Any

import gradio as gr
import httpx


RUNNING_ON_HF = bool(os.getenv("SPACE_ID"))
BASE_URL = os.getenv("BASE_URL", "https://schedule-savvy-schedules.onrender.com").rstrip("/")
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
    if RUNNING_ON_HF and BASE_URL == "http://localhost:8000":
        return (
            "Backend URL is not configured for this Space.\n\n"
            "Set `BASE_URL` in Hugging Face Space Variables to your Render backend URL, for example:\n"
            "`https://your-service.onrender.com`"
        )
    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            res = client.post(f"{BASE_URL}/chat", json={"query": message})
            res.raise_for_status()
        payload = res.json()
        answer = payload.get("answer", "No answer returned.")
        mode = payload.get("mode", "unknown")
        sources_md = _render_sources(payload.get("sources", []))
        return f"{answer}\n\n**Mode:** `{mode}`\n\n**Sources**\n{sources_md}"
    except httpx.ConnectError:
        return (
            "Could not connect to backend service.\n\n"
            f"Current `BASE_URL`: `{BASE_URL}`\n\n"
            "Verify the URL is correct, publicly reachable, and the backend is running."
        )
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

def on_user_submit(message: str, history: list[tuple[str, str]]) -> tuple[str, list[tuple[str, str]]]:
    cleaned = message.strip()
    if not cleaned:
        return "", history
    return "", [*history, (cleaned, "")]


def on_bot_respond(history: list[tuple[str, str]]) -> list[tuple[str, str]]:
    if not history:
        return history
    user_msg, bot_msg = history[-1]
    if bot_msg:
        return history
    answer = respond(user_msg, history[:-1])
    history[-1] = (user_msg, answer)
    return history


CUSTOM_CSS = """
:root {
  --bg: #141724;
  --bg-soft: #1a1f31;
  --surface: rgba(255, 255, 255, 0.06);
  --surface-strong: rgba(255, 255, 255, 0.1);
  --border: rgba(173, 184, 255, 0.24);
  --text: #f4f6ff;
  --muted: #b4bcdf;
  --primary: #dee0ff;
  --primary-ink: #1f2557;
  --ring: rgba(222, 224, 255, 0.45);
}

.gradio-container {
  background:
    radial-gradient(circle at 10% 8%, rgba(63, 81, 181, 0.34), transparent 38%),
    radial-gradient(circle at 88% 0%, rgba(255, 128, 180, 0.16), transparent 45%),
    var(--bg) !important;
  color: var(--text) !important;
  font-family: "Segoe UI", "SF Pro Text", "Helvetica Neue", sans-serif !important;
}

#app-shell {
  max-width: 1040px;
  margin: 18px auto;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--surface-strong), var(--surface));
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(14px);
  overflow: hidden;
}

#hero {
  padding: 26px 24px 20px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(115deg, rgba(63, 81, 181, 0.34), rgba(18, 23, 44, 0.45));
}

#hero h1 {
  margin: 0;
  font-size: 1.72rem;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

#hero p {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 0.94rem;
}

#badge-row {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.info-badge {
  font-size: 0.74rem;
  border: 1px solid var(--border);
  padding: 6px 11px;
  border-radius: 999px;
  color: var(--primary);
  background: rgba(255, 255, 255, 0.06);
}

#chat-wrap {
  padding: 16px 16px 8px;
}

#example-wrap {
  padding: 0 16px 16px;
}

button.primary {
  background: linear-gradient(90deg, var(--primary), #b7beff) !important;
  color: var(--primary-ink) !important;
  border: 1px solid rgba(255, 255, 255, 0.55) !important;
  font-weight: 600 !important;
}

button.secondary {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--text) !important;
  border: 1px solid var(--border) !important;
}

.gradio-container .gr-box,
.gradio-container .gr-panel,
.gradio-container .gr-form {
  background: var(--bg-soft) !important;
  border-color: var(--border) !important;
}

.gradio-container textarea,
.gradio-container input {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--text) !important;
  border: 1px solid var(--border) !important;
}

.gradio-container textarea:focus,
.gradio-container input:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px var(--ring) !important;
}

.message.user {
  border: 1px solid rgba(222, 224, 255, 0.26) !important;
}

.message.bot {
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}
"""


with gr.Blocks(title="CUK Assistant", css=CUSTOM_CSS, theme=gr.themes.Base()) as demo:
    with gr.Column(elem_id="app-shell"):
        gr.HTML(
            """
            <div id="hero">
              <h1>CUK Assistant — Official Help Desk</h1>
              <p>Indigo Prism edition: clear, source-grounded answers for admissions, exams, courses, and university notices.</p>
              <div id="badge-row">
                <span class="info-badge">Powered by Supabase + RAG</span>
                <span class="info-badge">Exa fallback enabled</span>
                <span class="info-badge">Admin Dashboard visual match</span>
              </div>
            </div>
            """
        )
        with gr.Column(elem_id="chat-wrap"):
            chatbot = gr.Chatbot(
                height=530,
                type="tuples",
                show_label=False,
                avatar_images=(None, None),
                bubble_full_width=False,
                placeholder="Ask anything about Central University of Kashmir.",
            )
            with gr.Row():
                textbox = gr.Textbox(
                    placeholder="Type your question and press Enter...",
                    scale=8,
                    show_label=False,
                )
                send_btn = gr.Button("Ask", variant="primary", scale=1)
            clear_btn = gr.Button("Clear chat", variant="secondary")
        with gr.Column(elem_id="example-wrap"):
            gr.Examples(examples=examples, inputs=textbox, label="Example questions")

    textbox.submit(on_user_submit, [textbox, chatbot], [textbox, chatbot], queue=False).then(
        on_bot_respond, chatbot, chatbot
    )
    send_btn.click(on_user_submit, [textbox, chatbot], [textbox, chatbot], queue=False).then(
        on_bot_respond, chatbot, chatbot
    )
    clear_btn.click(lambda: [], None, chatbot, queue=False)


if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=int(os.getenv("PORT", "7860")),
        theme=gr.themes.Soft(),
    )
