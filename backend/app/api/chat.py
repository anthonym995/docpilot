import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth.dependencies import AuthenticatedUser, get_current_user
from app.chat.streaming import stream_stubbed_turn
from app.database.chats import (
    create_thread,
    ensure_user,
    get_thread,
    get_thread_messages,
    list_threads,
)

router = APIRouter(prefix="/chat", tags=["chat"])


class CreateThreadRequest(BaseModel):
    title: str = "New Chat"


class ChatStreamRequest(BaseModel):
    threadId: uuid.UUID | None = None
    id: uuid.UUID | None = None
    messages: list[dict[str, Any]] = []


@router.get("/threads")
async def get_threads(user: AuthenticatedUser = Depends(get_current_user)):
    """List threads for the authenticated user."""
    await ensure_user(user.user_id, user.email)
    return await list_threads(user.user_id)


@router.post("/threads", status_code=status.HTTP_201_CREATED)
async def post_create_thread(
    req: CreateThreadRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Create a new chat thread."""
    await ensure_user(user.user_id, user.email)
    return await create_thread(user.user_id, title=req.title.strip() or "New Chat")


@router.get("/threads/{thread_id}/messages")
async def get_thread_message_history(
    thread_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Fetch message history for a specific thread with 404/403 security checks."""
    thread = await get_thread(thread_id)
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found",
        )
    if str(thread.get("user_id")) != str(user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to thread",
        )
    return await get_thread_messages(thread_id)


@router.get("/threads/{thread_id}")
async def get_single_thread(
    thread_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Get thread metadata along with its messages."""
    thread = await get_thread(thread_id)
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found",
        )
    if str(thread.get("user_id")) != str(user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to thread",
        )
    messages = await get_thread_messages(thread_id)
    return {**thread, "messages": messages}


@router.post("/stream")
async def post_chat_stream(
    req: ChatStreamRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Stream stubbed assistant reply using AI SDK Data Stream protocol."""
    await ensure_user(user.user_id, user.email)

    effective_thread_id = req.threadId or req.id
    if not effective_thread_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing threadId in request",
        )

    thread = await get_thread(effective_thread_id)
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found",
        )
    if str(thread.get("user_id")) != str(user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to thread",
        )

    # Extract user content from last message
    user_content = ""
    if req.messages:
        last = req.messages[-1]
        if isinstance(last, dict):
            if "content" in last and isinstance(last["content"], str):
                user_content = last["content"]
            elif "parts" in last and isinstance(last["parts"], list):
                for part in last["parts"]:
                    if isinstance(part, dict) and part.get("type") == "text":
                        user_content += part.get("text", "")

    if not user_content:
        user_content = "SEC 10-K analysis query"

    return StreamingResponse(
        stream_stubbed_turn(
            thread_id=effective_thread_id,
            user_id=user.user_id,
            user_content=user_content,
        ),
        media_type="text/plain; charset=utf-8",
        headers={
            "x-vercel-ai-data-stream": "v1",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
