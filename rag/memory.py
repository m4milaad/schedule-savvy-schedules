"""
memory.py - Conversational memory and query rewriting.
"""
import logging
import re


log = logging.getLogger(__name__)


def rewrite_query(current_query: str, history: list[dict]) -> str:
    """
    Rewrite query based on conversation history.
    
    This is a simple heuristic-based rewriter that resolves pronouns
    and adds context from previous turns.
    
    Args:
        current_query: Current user query
        history: List of conversation turns [{"user": "...", "bot": "..."}]
    
    Returns:
        Rewritten query with resolved context
    """
    if not history:
        return current_query
    
    query_lower = current_query.lower()
    
    # Check for pronouns and demonstratives
    has_reference = any(
        word in query_lower
        for word in ["it", "this", "that", "these", "those", "they", "them", "he", "she", "his", "her"]
    )
    
    # Check for follow-up patterns
    is_followup = (
        query_lower.startswith(("what about", "how about", "and ", "also ", "tell me more", "more about"))
        or query_lower in {"yes", "no", "ok", "okay", "continue", "go on", "next"}
        or len(current_query.split()) <= 3
    )
    
    if not has_reference and not is_followup:
        return current_query
    
    # Get last user query for context
    last_user_query = ""
    if history:
        last_turn = history[-1]
        last_user_query = last_turn.get("user", "")
    
    # Extract topic from last query
    topic = _extract_topic(last_user_query)
    
    if not topic:
        return current_query
    
    # Rewrite patterns
    if query_lower.startswith("what about"):
        return current_query
    
    if query_lower.startswith(("and ", "also ")):
        return f"{topic} {current_query}"
    
    if query_lower in {"yes", "no", "ok", "okay", "continue"}:
        return last_user_query
    
    if query_lower.startswith("tell me more"):
        return last_user_query
    
    # Pronoun resolution
    if has_reference:
        return f"{topic} {current_query}"
    
    return current_query


def _extract_topic(query: str) -> str:
    """
    Extract main topic from query.
    
    Simple extraction of key nouns/phrases.
    """
    if not query:
        return ""
    
    # Remove common question words
    query_clean = re.sub(
        r"\b(what|when|where|who|how|why|is|are|was|were|do|does|did|can|could|should|would|the|a|an)\b",
        "",
        query.lower(),
        flags=re.I,
    )
    
    # Extract remaining words
    words = [w.strip() for w in query_clean.split() if len(w.strip()) > 2]
    
    if not words:
        return ""
    
    # Return first 3 words as topic
    return " ".join(words[:3])


if __name__ == "__main__":
    # Test query rewriting
    history = [
        {"user": "What is the admission process at CUK?", "bot": "The admission process requires CUET scores..."},
    ]
    
    test_queries = [
        "What about the fee structure?",
        "And the deadlines?",
        "Tell me more",
        "How do I apply?",
    ]
    
    print("Original history:")
    print(f"  User: {history[0]['user']}")
    print(f"  Bot: {history[0]['bot'][:50]}...\n")
    
    for query in test_queries:
        rewritten = rewrite_query(query, history)
        print(f"Original: {query}")
        print(f"Rewritten: {rewritten}")
        print()
