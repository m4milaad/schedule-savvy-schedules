#!/usr/bin/env python3
"""
test_rag.py - Test the RAG system end-to-end.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from rag.pipeline import run, app_status


def test_status():
    """Test system status."""
    print("=" * 60)
    print("  System Status Check")
    print("=" * 60)
    
    status = app_status()
    
    print(f"Generator configured: {status['generator_configured']}")
    print(f"Generator model: {status['generator_model']}")
    print(f"Knowledge base ready: {status['knowledge_base_ready']}")
    print(f"Collection: {status['collection_name']}")
    print(f"Chunk count: {status['chunk_count']}")
    print(f"Message: {status['message']}")
    print()
    
    if not status['generator_configured']:
        print("⚠️  Generator not configured. Set GROQ_API_KEY in .env")
        return False
    
    if not status['knowledge_base_ready']:
        print("⚠️  Knowledge base not ready. Run: python -m ingest.build_db --reset")
        return False
    
    print("✓ System is ready!")
    return True


def test_queries():
    """Test sample queries."""
    if not test_status():
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("  Testing Sample Queries")
    print("=" * 60)
    print()
    
    test_queries = [
        "What is the admission process at CUK?",
        "Tell me about the faculty in Computer Science department",
        "What are the important dates for admissions?",
    ]
    
    for query in test_queries:
        print(f"Query: {query}")
        print("-" * 60)
        
        try:
            answer, sources = run(query, [])
            
            print("Answer:")
            print(answer)
            print()
            
            if sources:
                print(f"Sources ({len(sources)}):")
                for source in sources[:3]:
                    print(f"  [{source['citation']}] {source['label']}")
                print()
        except Exception as exc:
            print(f"❌ Error: {exc}")
            print()
        
        print()


def interactive_mode():
    """Interactive query mode."""
    if not test_status():
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("  Interactive Mode")
    print("  Type 'quit' or 'exit' to stop")
    print("=" * 60)
    print()
    
    history = []
    
    while True:
        try:
            query = input("\nYou: ").strip()
            
            if query.lower() in {"quit", "exit", "q"}:
                print("Goodbye!")
                break
            
            if not query:
                continue
            
            print("\nNeMoX: ", end="", flush=True)
            answer, sources = run(query, history)
            print(answer)
            
            if sources:
                print(f"\n📚 Sources ({len(sources)}):")
                for source in sources[:3]:
                    url = source.get('url') or source.get('path') or 'N/A'
                    print(f"  [{source['citation']}] {source['label']}")
                    print(f"      {url}")
            
            # Add to history
            history.append({"user": query, "bot": answer})
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as exc:
            print(f"\n❌ Error: {exc}")


def main():
    """Main test routine."""
    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        interactive_mode()
    else:
        test_queries()


if __name__ == "__main__":
    main()
