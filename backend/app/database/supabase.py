from functools import lru_cache

from supabase import Client, ClientOptions, create_client

from app.config import settings


@lru_cache(maxsize=1)
def get_admin_client() -> Client:
    """Return privileged Supabase client using the service role key.

    Use for server-side maintenance, ingestion, and admin operations.
    Bypasses Row-Level Security.
    """
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
        ),
    )


def get_user_client(access_token: str) -> Client:
    """Return user-scoped Supabase client authenticated with the user's JWT.

    Uses SUPABASE_ANON_KEY and attaches the Authorization Bearer token header
    so Postgres Row-Level Security (RLS) policies evaluate against auth.uid().
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_ANON_KEY,
        options=ClientOptions(
            headers=headers,
            auto_refresh_token=False,
            persist_session=False,
        ),
    )

