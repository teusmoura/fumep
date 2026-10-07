"""Versioned PageTemplate block contract, independent of Nuxt demo fixtures."""

import re
from typing import Annotated, Any, Literal
from urllib.parse import parse_qsl, urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StringConstraints, model_validator


RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
InternalLink = Annotated[str, StringConstraints(pattern=r"^/[A-Za-z0-9_/-]*$")]
Limit = Annotated[StrictInt, Field(ge=1, le=12)]


class StrictData(BaseModel):
    model_config = ConfigDict(extra="forbid")


def _optional_button(label: str, url: str) -> bool:
    return not (label.strip() or url.strip()) or bool(label.strip() and re.fullmatch(r"/(?!/)[A-Za-z0-9_/-]*", url))


class TextData(StrictData):
    title: RequiredText
    body: RequiredText


class HeroData(StrictData):
    title: RequiredText
    description: str
    imageId: UUID
    imageAlt: str
    decorative: StrictBool
    buttonLabel: str
    buttonUrl: str

    @model_validator(mode="after")
    def valid_details(self):
        if not self.decorative and not self.imageAlt.strip():
            raise ValueError("Image alt is required")
        if not _optional_button(self.buttonLabel, self.buttonUrl):
            raise ValueError("Invalid internal CTA")
        return self


class ImageData(StrictData):
    imageId: UUID
    alt: str
    caption: str
    decorative: StrictBool
    link: str

    @model_validator(mode="after")
    def valid_details(self):
        if not self.decorative and not self.alt.strip():
            raise ValueError("Image alt is required")
        if self.link and not re.fullmatch(r"/(?!/)[A-Za-z0-9_/-]*", self.link):
            raise ValueError("Invalid internal link")
        return self


class ImageTextData(StrictData):
    title: RequiredText
    text: RequiredText
    imageId: UUID
    imageAlt: RequiredText
    imagePosition: Literal["IMAGE_LEFT", "IMAGE_RIGHT"]
    buttonLabel: str
    buttonUrl: str

    @model_validator(mode="after")
    def valid_button(self):
        if not _optional_button(self.buttonLabel, self.buttonUrl):
            raise ValueError("Invalid internal CTA")
        return self


class CardItem(StrictData):
    imageId: UUID
    alt: RequiredText
    title: RequiredText
    description: str
    url: str

    @model_validator(mode="after")
    def valid_url(self):
        if self.url and not re.fullmatch(r"/(?!/)[A-Za-z0-9_/-]*", self.url):
            raise ValueError("Invalid internal link")
        return self


class CardsData(StrictData):
    title: str
    items: list[CardItem] = Field(min_length=1, max_length=12)


class QuickLinkItem(StrictData):
    label: RequiredText
    url: InternalLink
    icon: Literal["NONE", "BOOK", "CALENDAR", "ARROW"]

    @model_validator(mode="after")
    def valid_url(self):
        if self.url.startswith("//"):
            raise ValueError("Invalid internal link")
        return self


class QuickLinksData(StrictData):
    title: str
    items: list[QuickLinkItem] = Field(min_length=1, max_length=12)


class CtaData(StrictData):
    title: RequiredText
    text: str
    buttonLabel: RequiredText
    buttonUrl: InternalLink

    @model_validator(mode="after")
    def valid_url(self):
        if self.buttonUrl.startswith("//"):
            raise ValueError("Invalid internal link")
        return self


class FaqItem(StrictData):
    question: RequiredText
    answer: RequiredText


class FaqData(StrictData):
    title: str
    items: list[FaqItem] = Field(min_length=1, max_length=30)


class TabItem(StrictData):
    label: RequiredText
    content: RequiredText


class TabsData(StrictData):
    tabs: list[TabItem] = Field(min_length=1, max_length=8)


class TableData(StrictData):
    caption: str
    headers: list[RequiredText] = Field(min_length=1, max_length=12)
    rows: list[list[str]] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def valid_columns(self):
        if any(len(row) != len(self.headers) for row in self.rows):
            raise ValueError("Table column count must match headers")
        return self


class TimelineItem(StrictData):
    date: str
    title: RequiredText
    description: RequiredText


class TimelineData(StrictData):
    title: str
    items: list[TimelineItem] = Field(min_length=1, max_length=50)


class StatisticItem(StrictData):
    value: RequiredText
    label: RequiredText
    description: str


class StatisticsData(StrictData):
    items: list[StatisticItem] = Field(min_length=1, max_length=12)


class CarouselItem(StrictData):
    imageId: UUID
    alt: RequiredText
    caption: str
    url: str

    @model_validator(mode="after")
    def valid_url(self):
        if self.url and not re.fullmatch(r"/(?!/)[A-Za-z0-9_/-]*", self.url):
            raise ValueError("Invalid internal link")
        return self


class CarouselData(StrictData):
    items: list[CarouselItem] = Field(min_length=1, max_length=10)


class MapData(StrictData):
    title: str
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    address: RequiredText
    zoom: StrictInt = Field(ge=1, le=20)


class VideoData(StrictData):
    url: str
    title: RequiredText
    description: str

    @model_validator(mode="after")
    def known_provider(self):
        url = urlsplit(self.url)
        if url.scheme != "https" or url.username or url.password or url.port or url.fragment:
            raise ValueError("Only HTTPS YouTube/Vimeo URLs are allowed")
        host = (url.hostname or "").lower()
        path = url.path
        if host in {"youtube.com", "www.youtube.com"}:
            params = parse_qsl(url.query, keep_blank_values=True)
            valid = path == "/watch" and len(params) == 1 and params[0][0] == "v" and bool(re.fullmatch(r"[A-Za-z0-9_-]{11}", params[0][1]))
        elif host == "youtu.be":
            valid = not url.query and bool(re.fullmatch(r"/[A-Za-z0-9_-]{11}", path))
        elif host in {"vimeo.com", "www.vimeo.com"}:
            valid = not url.query and bool(re.fullmatch(r"/[0-9]{1,15}", path))
        else:
            valid = False
        if not valid:
            raise ValueError("Only known YouTube/Vimeo video URLs are allowed")
        return self


class DocumentData(StrictData):
    mediaId: UUID
    title: str
    description: str
    buttonLabel: str


class CategorizedFeedData(StrictData):
    title: str
    institutionIds: list[UUID] = Field(max_length=20)
    categoryIds: list[UUID] = Field(max_length=20)
    limit: Limit
    order: Literal["DEFAULT"] | None = None


class SimpleFeedData(StrictData):
    title: str
    institutionIds: list[UUID] = Field(max_length=20)
    limit: Limit
    order: Literal["DEFAULT"] | None = None


class StatusFeedData(StrictData):
    title: str
    institutionIds: list[UUID] = Field(max_length=20)
    limit: Limit
    status: Literal["ALL", "OPEN", "CLOSED"]


class GalleryFeedData(StrictData):
    galleryId: UUID
    title: str
    limit: Limit


class SpacerData(StrictData):
    size: Literal["SMALL", "MEDIUM", "LARGE"]


BLOCK_DATA_V1: dict[str, type[StrictData]] = {
    "TEXT": TextData, "HERO": HeroData, "IMAGE": ImageData, "IMAGE_TEXT": ImageTextData,
    "CARDS": CardsData, "QUICK_LINKS": QuickLinksData, "CTA": CtaData,
    "FAQ": FaqData, "TABS": TabsData, "TABLE": TableData, "TIMELINE": TimelineData,
    "STATISTICS": StatisticsData, "CAROUSEL": CarouselData, "MAP": MapData,
    "VIDEO": VideoData, "DOCUMENT": DocumentData, "NEWS_FEED": CategorizedFeedData,
    "EVENT_FEED": CategorizedFeedData, "COURSE_FEED": SimpleFeedData,
    "CONTEST_FEED": StatusFeedData, "SELECTION_PROCESS_FEED": StatusFeedData,
    "GALLERY_FEED": GalleryFeedData, "SPACER": SpacerData,
}

BlockTypeV1 = Literal[
    "TEXT", "HERO", "IMAGE", "IMAGE_TEXT", "CARDS", "QUICK_LINKS", "CTA", "FAQ",
    "TABS", "TABLE", "TIMELINE", "STATISTICS", "CAROUSEL", "MAP", "VIDEO",
    "DOCUMENT", "NEWS_FEED", "EVENT_FEED", "COURSE_FEED", "CONTEST_FEED",
    "SELECTION_PROCESS_FEED", "GALLERY_FEED", "SPACER",
]


class BlockSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    type: BlockTypeV1
    position: StrictInt = Field(ge=0)
    isVisible: StrictBool
    schemaVersion: Literal[1]
    background: Literal["DEFAULT", "LIGHT", "INSTITUTION", "IMAGE"]
    backgroundMediaId: UUID | None = None
    anchor: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9-]*$", max_length=100)
    data: dict[str, Any]

    @model_validator(mode="after")
    def valid_type_and_data(self):
        schema = BLOCK_DATA_V1.get(self.type)
        if schema is None:
            raise ValueError("Unknown block type or schema version")
        self.data = schema.model_validate(self.data).model_dump(mode="json", exclude_none=True)
        if (self.background == "IMAGE") != (self.backgroundMediaId is not None):
            raise ValueError("IMAGE background requires media; other backgrounds forbid it")
        return self


def validate_snapshot(blocks: list[BlockSnapshot]) -> None:
    if not blocks:
        raise ValueError("Template requires at least one block")
    if len(blocks) > 100:
        raise ValueError("Template has too many blocks")
    if len({block.id for block in blocks}) != len(blocks):
        raise ValueError("Block IDs must be unique")
    anchors = [block.anchor for block in blocks if block.anchor]
    if len(set(anchors)) != len(anchors):
        raise ValueError("Block anchors must be unique")
    if any(block.position != position for position, block in enumerate(blocks)):
        raise ValueError("Block positions must be contiguous and ordered")


def block_references(block: BlockSnapshot) -> tuple[list[tuple[str, UUID, str]], list[UUID], list[UUID], list[UUID]]:
    """Return media path/type and institution/category/gallery references."""
    data = block.data
    media: list[tuple[str, UUID, str]] = []
    if block.backgroundMediaId is not None:
        media.append(("backgroundMediaId", block.backgroundMediaId, "IMAGE"))
    if block.type in {"HERO", "IMAGE", "IMAGE_TEXT"}:
        media.append(("data.imageId", UUID(data["imageId"]), "IMAGE"))
    elif block.type in {"CARDS", "CAROUSEL"}:
        media.extend((f"data.items.{i}.imageId", UUID(item["imageId"]), "IMAGE") for i, item in enumerate(data["items"]))
    elif block.type == "DOCUMENT":
        media.append(("data.mediaId", UUID(data["mediaId"]), "DOCUMENT"))
    institutions = [UUID(value) for value in data.get("institutionIds", [])]
    categories = [UUID(value) for value in data.get("categoryIds", [])]
    galleries = [UUID(data["galleryId"])] if block.type == "GALLERY_FEED" else []
    return media, institutions, categories, galleries
