import asyncio
import json
import uuid
from unittest.mock import AsyncMock, patch

from app.chat.streaming import (
    build_stub_reply,
    format_finish_message,
    format_text_delta,
    stream_stubbed_turn,
)


def test_format_text_delta():
    delta = format_text_delta("hello world")
    assert delta.startswith("0:")
    assert delta.endswith("\n")
    parsed = json.loads(delta[2:-1])
    assert parsed == "hello world"


def test_format_finish_message():
    finish = format_finish_message("stop", {"promptTokens": 5, "completionTokens": 10})
    assert finish.startswith("d:")
    assert finish.endswith("\n")
    payload = json.loads(finish[2:-1])
    assert payload["finishReason"] == "stop"
    assert payload["usage"]["promptTokens"] == 5
    assert payload["usage"]["completionTokens"] == 10


def test_build_stub_reply():
    reply = build_stub_reply("What is Apple's revenue?")
    assert "Apple's revenue" in reply
    assert "SEC 10-K" in reply


def test_stream_stubbed_turn_yields_and_persists():
    async def _run():
        thread_id = uuid.uuid4()
        user_id = uuid.uuid4()
        user_query = "Summarize risk factors"

        with patch(
            "app.chat.streaming.persist_chat_turn", new_callable=AsyncMock
        ) as mock_persist:
            mock_persist.return_value = ({"id": "msg-1"}, {"id": "msg-2"})

            chunks: list[str] = []
            async for chunk in stream_stubbed_turn(
                thread_id=thread_id,
                user_id=user_id,
                user_content=user_query,
                delay_seconds=0.0,
            ):
                chunks.append(chunk)

            # Verify chunks received
            assert len(chunks) > 2
            # Text deltas prefix
            text_chunks = [c for c in chunks if c.startswith("0:")]
            assert len(text_chunks) > 0
            # Finish chunk prefix
            finish_chunks = [c for c in chunks if c.startswith("d:")]
            assert len(finish_chunks) == 1

            # Verify persistence was called with both user and assistant content
            mock_persist.assert_awaited_once()
            _, kwargs = mock_persist.call_args
            assert kwargs["thread_id"] == thread_id
            assert kwargs["user_id"] == user_id
            assert kwargs["user_content"] == user_query
            assert "risk factors" in kwargs["assistant_content"]

    asyncio.run(_run())
