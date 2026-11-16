import asyncio
import uuid
from typing import Any

from sqlalchemy import desc, select

from app.database.chat_message import ChatMessage
from app.database.chat_thread import ChatThread
from app.database.session import SessionLocal
from app.database.user import User


def _ensure_user_sync(user_id: uuid.UUID, email: str) -> dict[str, Any]:
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if not user:
            user = User(id=user_id, email=email)
            db.add(user)
            db.commit()
            db.refresh(user)
        return {"id": str(user.id), "email": user.email}


async def ensure_user(user_id: uuid.UUID, email: str) -> dict[str, Any]:
    """Ensure a user record exists in the database for foreign key integrity."""
    return await asyncio.to_thread(_ensure_user_sync, user_id, email)


def _list_threads_sync(user_id: uuid.UUID) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        stmt = (
            select(ChatThread)
            .where(ChatThread.user_id == user_id)
            .order_by(desc(ChatThread.updated_at))
        )
        threads = db.scalars(stmt).all()
        return [
            {
                "id": str(t.id),
                "user_id": str(t.user_id),
                "title": t.title,
                "created_at": t.created_at.isoformat(),
                "updated_at": t.updated_at.isoformat(),
            }
            for t in threads
        ]


async def list_threads(user_id: uuid.UUID) -> list[dict[str, Any]]:
    """List all chat threads for the specified user."""
    return await asyncio.to_thread(_list_threads_sync, user_id)


def _create_thread_sync(user_id: uuid.UUID, title: str) -> dict[str, Any]:
    with SessionLocal() as db:
        thread = ChatThread(user_id=user_id, title=title)
        db.add(thread)
        db.commit()
        db.refresh(thread)
        return {
            "id": str(thread.id),
            "user_id": str(thread.user_id),
            "title": thread.title,
            "created_at": thread.created_at.isoformat(),
            "updated_at": thread.updated_at.isoformat(),
        }


async def create_thread(user_id: uuid.UUID, title: str = "New Chat") -> dict[str, Any]:
    """Create a new chat thread."""
    return await asyncio.to_thread(_create_thread_sync, user_id, title)


def _get_thread_sync(thread_id: uuid.UUID) -> dict[str, Any] | None:
    with SessionLocal() as db:
        thread = db.get(ChatThread, thread_id)
        if not thread:
            return None
        return {
            "id": str(thread.id),
            "user_id": str(thread.user_id),
            "title": thread.title,
            "created_at": thread.created_at.isoformat(),
            "updated_at": thread.updated_at.isoformat(),
        }


async def get_thread(thread_id: uuid.UUID) -> dict[str, Any] | None:
    """Fetch thread by ID."""
    return await asyncio.to_thread(_get_thread_sync, thread_id)


def _get_thread_messages_sync(thread_id: uuid.UUID) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at.asc())
        )
        messages = db.scalars(stmt).all()
        return [
            {
                "id": str(m.id),
                "thread_id": str(m.thread_id),
                "user_id": str(m.user_id),
                "role": m.role,
                "content": m.content,
                "parts": m.parts,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ]


async def get_thread_messages(thread_id: uuid.UUID) -> list[dict[str, Any]]:
    """Fetch all messages for a thread."""
    return await asyncio.to_thread(_get_thread_messages_sync, thread_id)


def _persist_chat_turn_sync(
    thread_id: uuid.UUID,
    user_id: uuid.UUID,
    user_content: str,
    assistant_content: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    with SessionLocal() as db:
        user_msg = ChatMessage(
            thread_id=thread_id,
            user_id=user_id,
            role="user",
            content=user_content,
            parts=[{"type": "text", "text": user_content}],
        )
        assistant_msg = ChatMessage(
            thread_id=thread_id,
            user_id=user_id,
            role="assistant",
            content=assistant_content,
            parts=[{"type": "text", "text": assistant_content}],
        )
        db.add_all([user_msg, assistant_msg])
        db.commit()
        db.refresh(user_msg)
        db.refresh(assistant_msg)
        return (
            {
                "id": str(user_msg.id),
                "role": user_msg.role,
                "content": user_msg.content,
            },
            {
                "id": str(assistant_msg.id),
                "role": assistant_msg.role,
                "content": assistant_msg.content,
            },
        )


async def persist_chat_turn(
    thread_id: uuid.UUID,
    user_id: uuid.UUID,
    user_content: str,
    assistant_content: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Persist both the user prompt and the assistant response in a single transaction."""
    return await asyncio.to_thread(
        _persist_chat_turn_sync, thread_id, user_id, user_content, assistant_content
    )

