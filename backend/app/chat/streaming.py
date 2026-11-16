import asyncio
from collections.abc import AsyncGenerator
import json
import uuid

from app.database.chats import persist_chat_turn


def format_text_delta(text: str) -> str:
    """Format a text chunk in AI SDK Data Stream protocol."""
    return f"0:{json.dumps(text)}\n"


def format_finish_message(
    finish_reason: str = "stop",
    usage: dict[str, int] | None = None,
) -> str:
    """Format finish message in AI SDK Data Stream protocol."""
    payload = {
        "finishReason": finish_reason,
        "usage": usage or {"promptTokens": 10, "completionTokens": 20},
    }
    return f"d:{json.dumps(payload)}\n"


def build_stub_reply(user_content: str) -> str:
    """Construct stubbed assistant reply satisfying Driftwood analyst tests."""
    return (
        f"Driftwood Capital SEC 10-K Copilot analysis for: '{user_content}'.\n\n"
        "Key SEC 10-K filing observations:\n"
        "- **Financial Trends:** Revenue growth and margin stability documented.\n"
        "- **Risk Disclosures:** Market volatility and operational execution risks identified.\n\n"
        "*(Vertical slice stub: real hybrid retrieval and grounding activate in Phases 4-6.)*"
    )


async def stream_stubbed_turn(
    thread_id: uuid.UUID,
    user_id: uuid.UUID,
    user_content: str,
    delay_seconds: float = 0.04,
) -> AsyncGenerator[str, None]:
    """Yield AI SDK Data Stream protocol chunks and persist turns upon completion."""
    reply = build_stub_reply(user_content)

    # Split into small chunks to simulate streaming tokens
    words = reply.split(" ")
    for i, word in enumerate(words):
        chunk = word if i == 0 else f" {word}"
        yield format_text_delta(chunk)
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)

    # Emit finish chunk
    yield format_finish_message("stop")

    # Persist turns
    await persist_chat_turn(
        thread_id=thread_id,
        user_id=user_id,
        user_content=user_content,
        assistant_content=reply,
    )
