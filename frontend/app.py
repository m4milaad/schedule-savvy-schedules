from __future__ import annotations

import os
import time
from typing import Any

import gradio as gr
import httpx


RUNNING_ON_HF = bool(os.getenv("SPACE_ID"))
BASE_URL = os.getenv("BASE_URL", "https://schedule-savvy-schedules.onrender.com").rstrip("/")
REQUEST_TIMEOUT = 20
MAX_RETRIES = 2


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
            res = None
            for attempt in range(MAX_RETRIES + 1):
                res = client.post(f"{BASE_URL}/chat", json={"query": message})
                if res.status_code not in {502, 503, 504}:
                    break
                if attempt < MAX_RETRIES:
                    time.sleep(1.2 * (attempt + 1))
            if res is None:
                return "The assistant is temporarily unavailable."
            res.raise_for_status()
        payload = res.json()
        answer = payload.get("answer", "No answer returned.")
        mode = payload.get("mode", "unknown")
        sources_md = _render_sources(payload.get("sources", []))
        return f"{answer}\n\n**Mode:** `{mode}`\n\n**Sources**\n{sources_md}"
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in {502, 503, 504}:
            return (
                "The backend is waking up or temporarily overloaded.\n\n"
                "Please retry in 10-20 seconds."
            )
        return f"Service temporarily unavailable: HTTP {exc.response.status_code}"
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

def on_user_submit(message: str, history: list[dict[str, str]]) -> tuple[str, list[dict[str, str]]]:
    cleaned = message.strip()
    if not cleaned:
        return "", history
    return "", [*history, {"role": "user", "content": cleaned}]


def on_bot_respond(history: list[dict[str, str]]) -> list[dict[str, str]]:
    if not history:
        return history
    if history[-1].get("role") != "user":
        return history
    user_msg = history[-1].get("content", "")
    answer = respond(user_msg, [])
    return [*history, {"role": "assistant", "content": answer}]


CUSTOM_CSS = """
:root {
  --background: hsl(230, 43%, 98%);
  --foreground: hsl(210, 11%, 11%);
  --border: hsl(240, 12%, 85%);
  --primary: hsl(230, 48%, 47%);
  --primary-foreground: #ffffff;
  --muted: hsl(228, 14%, 93%);
  --muted-foreground: hsl(235, 8%, 40%);
  --ring: hsla(230, 48%, 47%, 0.25);
}

.gradio-container {
  background-color: var(--background) !important;
  background-image:
    radial-gradient(circle at 25px 25px, hsla(230, 48%, 47%, 0.04) 2%, transparent 0%),
    radial-gradient(circle at 75px 75px, hsla(230, 48%, 47%, 0.04) 2%, transparent 0%) !important;
  background-size: 100px 100px !important;
  color: var(--foreground) !important;
  font-family: "Segoe UI", "SF Pro Text", -apple-system, sans-serif !important;
}

#app-shell {
  max-width: 1040px;
  margin: 32px auto;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.45));
  box-shadow: 0 4px 24px -12px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  overflow: hidden;
}

#hero {
  padding: 28px 28px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.5);
}

.linear-kicker {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 8px;
}

#hero h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--foreground);
  letter-spacing: -0.02em;
}

#badge-row {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  padding: 4px 12px;
  border-radius: 9999px;
  border: 1px solid hsla(230, 48%, 47%, 0.2);
  background: hsla(230, 48%, 47%, 0.05);
  color: var(--primary);
  font-weight: 500;
  letter-spacing: 0.02em;
}

#chat-wrap {
  padding: 24px;
}

#example-wrap {
  padding: 0 24px 24px;
}

button.primary {
  background: var(--primary) !important;
  color: var(--primary-foreground) !important;
  border: none !important;
  font-weight: 500 !important;
  border-radius: 10px !important;
  box-shadow: 0 2px 4px hsla(230, 48%, 47%, 0.25) !important;
  transition: all 0.2s ease !important;
}

button.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px hsla(230, 48%, 47%, 0.35) !important;
}

button.secondary {
  background: white !important;
  color: var(--muted-foreground) !important;
  border: 1px solid var(--border) !important;
  border-radius: 10px !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03) !important;
  transition: all 0.2s ease !important;
}

button.secondary:hover {
  background: var(--muted) !important;
}

.gradio-container .gr-box,
.gradio-container .gr-panel,
.gradio-container .gr-form {
  background: transparent !important;
  border-color: var(--border) !important;
}

.gradio-container textarea,
.gradio-container input {
  background: white !important;
  color: var(--foreground) !important;
  border: 1px solid var(--border) !important;
  border-radius: 10px !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02) inset !important;
  transition: all 0.2s ease !important;
}

.gradio-container textarea:focus,
.gradio-container input:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px var(--ring) !important;
}

.message.user {
  background: var(--primary) !important;
  color: var(--primary-foreground) !important;
  border: none !important;
  border-radius: 16px 16px 4px 16px !important;
  padding: 12px 16px !important;
  box-shadow: 0 2px 6px hsla(230, 48%, 47%, 0.25) !important;
}

.message.bot {
  background: white !important;
  color: var(--foreground) !important;
  border: 1px solid var(--border) !important;
  border-radius: 16px 16px 16px 4px !important;
  padding: 12px 16px !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.03) !important;
}

.message p {
  margin-bottom: 0 !important;
}
"""


with gr.Blocks(title="Knowledge Assistant", css=CUSTOM_CSS, theme=gr.themes.Base()) as demo:
    with gr.Column(elem_id="app-shell"):
        gr.HTML(
            """
            <div id="hero">
              <div class="linear-kicker">AI Support</div>
              <h1>Knowledge Assistant</h1>
              <div id="badge-row">
                <span class="info-badge">Retrieval-Only Assistant</span>
              </div>
            </div>
            """
        )
        with gr.Column(elem_id="chat-wrap"):
            chatbot = gr.Chatbot(
                height=530,
                show_label=False,
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
    )
