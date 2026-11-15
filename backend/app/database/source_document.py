import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.database.document_chunk import DocumentChunk
    from app.database.message_citation import MessageCitation


class SourceDocument(Base, TimestampMixin):
    """SEC filings and company documents."""

    __tablename__ = "source_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    cik: Mapped[str | None] = mapped_column(String(20), nullable=True)
    form: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # e.g. 10-K
    filing_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    report_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    fiscal_year: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    accession_number: Mapped[str | None] = mapped_column(
        String(50), nullable=True, unique=True
    )
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    normalized_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index",
    )
    citations: Mapped[list["MessageCitation"]] = relationship(
        "MessageCitation", back_populates="document"
    )
