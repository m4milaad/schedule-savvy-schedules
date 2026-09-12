"""
prompt.py - Prompt construction for answer generation.
"""
import re
from typing import Any


SYSTEM_PROMPT = """You are an AI assistant for Central University of Kashmir (CUK). Your role is to provide accurate, helpful information about the university based on the provided context.

Guidelines:
1. Answer questions using ONLY the provided context
2. If the context doesn't contain enough information, say "I don't have that information. Please contact the university office directly."
3. Cite sources using [1], [2], etc. format
4. Be concise but complete
5. Maintain a professional, helpful tone
6. For contact information, provide exact details from context
7. For dates and deadlines, be precise and include sources

Context will be provided with each question."""


def _format_context(chunks: list[dict]) -> str:
    """Format retrieved chunks as context."""
    context_parts = []
    
    for idx, chunk in enumerate(chunks, 1):
        title = chunk.get("title", "Source")
        category = chunk.get("category", "general")
        text = chunk.get("text", "")
        
        context_parts.append(f"[{idx}] {title} ({category})")
        context_parts.append(text)
        context_parts.append("")  # Empty line between sources
    
    return "\n".join(context_parts)


def _format_history(history: list[dict], max_turns: int = 3) -> str:
    """Format conversation history."""
    if not history:
        return ""
    
    history_parts = []
    recent_history = history[-max_turns:]
    
    for turn in recent_history:
        user_msg = turn.get("user", "")
        bot_msg = turn.get("bot", "")
        
        if user_msg:
            history_parts.append(f"User: {user_msg}")
        if bot_msg:
            # Truncate long responses
            bot_truncated = bot_msg[:300] + "..." if len(bot_msg) > 300 else bot_msg
            history_parts.append(f"Assistant: {bot_truncated}")
    
    return "\n".join(history_parts)


def build_prompt(
    query: str,
    chunks: list[dict],
    history: list[dict] | None = None,
    answer_style: str = "balanced",
) -> str:
    """
    Build complete prompt for LLM.
    
    Args:
        query: User query
        chunks: Retrieved and reranked chunks
        history: Conversation history
        answer_style: Answer style (balanced, detailed, concise)
    
    Returns:
        Complete prompt string
    """
    style_instructions = {
        "balanced": "Provide a clear, well-structured answer with appropriate detail.",
        "detailed": "Provide a comprehensive, detailed answer with all relevant information from the context.",
        "concise": "Provide a brief, direct answer focusing on the key information.",
    }
    
    style_instruction = style_instructions.get(answer_style, style_instructions["balanced"])
    
    # Build prompt parts
    parts = [SYSTEM_PROMPT]
    
    # Add conversation history if available
    if history:
        history_text = _format_history(history)
        if history_text:
            parts.append("\nPrevious conversation:")
            parts.append(history_text)
    
    # Add context
    context = _format_context(chunks)
    parts.append("\nContext from university documents:")
    parts.append(context)
    
    # Add style instruction
    parts.append(f"\nAnswer style: {style_instruction}")
    
    # Add user query
    parts.append(f"\nUser question: {query}")
    parts.append("\nProvide your answer below, citing sources with [1], [2], etc.:")
    
    return "\n".join(parts)


if __name__ == "__main__":
    # Test prompt building
    query = "What is the admission process?"
    
    chunks = [
        {
            "title": "Admissions 2024",
            "category": "admissions",
            "text": "Admission to CUK requires CUET scores. Candidates must apply online through the official portal.",
        },
        {
            "title": "Application Process",
            "category": "admissions",
            "text": "The application process opens in June. Candidates need to upload documents including CUET scorecard.",
        },
    ]
    
    history = [
        {"user": "Tell me about CUK", "bot": "CUK is Central University of Kashmir..."},
    ]
    
    prompt = build_prompt(query, chunks, history, answer_style="balanced")
    
    print("Generated Prompt:")
    print("=" * 60)
    print(prompt)
    print("=" * 60)
