import uuid
from collections.abc import Generator
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.auth.dependencies import AuthenticatedUser, get_current_user
from app.main import app

CURRENT_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
OTHER_USER_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")


@pytest.fixture
def auth_user() -> AuthenticatedUser:
    return AuthenticatedUser(
        user_id=CURRENT_USER_ID,
        email="analyst@driftwood.com",
        access_token="fake-jwt-token",
    )


@pytest.fixture
def client(auth_user: AuthenticatedUser) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_current_user] = lambda: auth_user
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_threads(client: TestClient):
    sample_threads = [
        {
            "id": str(uuid.uuid4()),
            "user_id": str(CURRENT_USER_ID),
            "title": "Apple FY2023 Analysis",
            "created_at": "2026-11-15T12:00:00Z",
            "updated_at": "2026-11-15T12:00:00Z",
        }
    ]
    with (
        patch("app.api.chat.ensure_user", new_callable=AsyncMock),
        patch("app.api.chat.list_threads", new_callable=AsyncMock) as mock_list,
    ):
        mock_list.return_value = sample_threads
        response = client.get("/chat/threads")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Apple FY2023 Analysis"
        mock_list.assert_awaited_once_with(CURRENT_USER_ID)


def test_create_thread(client: TestClient):
    created = {
        "id": str(uuid.uuid4()),
        "user_id": str(CURRENT_USER_ID),
        "title": "Microsoft Revenue",
        "created_at": "2026-11-15T12:00:00Z",
        "updated_at": "2026-11-15T12:00:00Z",
    }
    with (
        patch("app.api.chat.ensure_user", new_callable=AsyncMock),
        patch("app.api.chat.create_thread", new_callable=AsyncMock) as mock_create,
    ):
        mock_create.return_value = created
        response = client.post("/chat/threads", json={"title": "Microsoft Revenue"})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["title"] == "Microsoft Revenue"
        mock_create.assert_awaited_once_with(CURRENT_USER_ID, title="Microsoft Revenue")


def test_get_thread_messages_success(client: TestClient):
    thread_id = uuid.uuid4()
    thread_record = {
        "id": str(thread_id),
        "user_id": str(CURRENT_USER_ID),
        "title": "Test Thread",
    }
    sample_messages = [
        {
            "id": str(uuid.uuid4()),
            "thread_id": str(thread_id),
            "role": "user",
            "content": "Hello",
        }
    ]
    with (
        patch("app.api.chat.get_thread", new_callable=AsyncMock) as mock_get_thread,
        patch("app.api.chat.get_thread_messages", new_callable=AsyncMock) as mock_msgs,
    ):
        mock_get_thread.return_value = thread_record
        mock_msgs.return_value = sample_messages

        response = client.get(f"/chat/threads/{thread_id}/messages")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) == 1


def test_get_thread_messages_not_found(client: TestClient):
    thread_id = uuid.uuid4()
    with patch("app.api.chat.get_thread", new_callable=AsyncMock) as mock_get_thread:
        mock_get_thread.return_value = None
        response = client.get(f"/chat/threads/{thread_id}/messages")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "Thread not found"


def test_get_thread_messages_forbidden(client: TestClient):
    thread_id = uuid.uuid4()
    thread_belonging_to_other = {
        "id": str(thread_id),
        "user_id": str(OTHER_USER_ID),
        "title": "Other Analyst's Thread",
    }
    with patch("app.api.chat.get_thread", new_callable=AsyncMock) as mock_get_thread:
        mock_get_thread.return_value = thread_belonging_to_other
        response = client.get(f"/chat/threads/{thread_id}/messages")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.json()["detail"] == "Access denied to thread"


def test_chat_stream_success(client: TestClient):
    thread_id = uuid.uuid4()
    thread_record = {
        "id": str(thread_id),
        "user_id": str(CURRENT_USER_ID),
        "title": "Stream Test",
    }
    with (
        patch("app.api.chat.ensure_user", new_callable=AsyncMock),
        patch("app.api.chat.get_thread", new_callable=AsyncMock) as mock_get_thread,
        patch("app.chat.streaming.persist_chat_turn", new_callable=AsyncMock),
    ):
        mock_get_thread.return_value = thread_record

        payload = {
            "threadId": str(thread_id),
            "messages": [
                {
                    "role": "user",
                    "content": "What was NVDA gross margin?",
                }
            ],
        }
        response = client.post("/chat/stream", json=payload)
        assert response.status_code == status.HTTP_200_OK
        assert response.headers.get("x-vercel-ai-data-stream") == "v1"
        content = response.text
        assert "0:" in content
        assert "d:" in content


def test_chat_stream_missing_thread_404(client: TestClient):
    thread_id = uuid.uuid4()
    with (
        patch("app.api.chat.ensure_user", new_callable=AsyncMock),
        patch("app.api.chat.get_thread", new_callable=AsyncMock) as mock_get_thread,
    ):
        mock_get_thread.return_value = None
        payload = {
            "threadId": str(thread_id),
            "messages": [{"role": "user", "content": "hi"}],
        }
        response = client.post("/chat/stream", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND


def test_chat_stream_other_user_thread_403(client: TestClient):
    thread_id = uuid.uuid4()
    thread_belonging_to_other = {
        "id": str(thread_id),
        "user_id": str(OTHER_USER_ID),
        "title": "Other Analyst's Thread",
    }
    with (
        patch("app.api.chat.ensure_user", new_callable=AsyncMock),
        patch("app.api.chat.get_thread", new_callable=AsyncMock) as mock_get_thread,
    ):
        mock_get_thread.return_value = thread_belonging_to_other
        payload = {
            "threadId": str(thread_id),
            "messages": [{"role": "user", "content": "hi"}],
        }
        response = client.post("/chat/stream", json=payload)
        assert response.status_code == status.HTTP_403_FORBIDDEN


def test_unauthenticated_request_401():
    unauthed_client = TestClient(app)
    response = unauthed_client.get("/chat/threads")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
