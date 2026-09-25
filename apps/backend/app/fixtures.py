"""Temporary public demonstration data; never a persistence adapter."""

from uuid import UUID

from .schemas import PublicInstitutionTheme


PUBLIC_THEMES: dict[str, PublicInstitutionTheme] = {
    slug: PublicInstitutionTheme(
        id=UUID(f"11111111-1111-4111-8111-11111111111{index}"),
        slug=slug,
        primary=primary,
        primaryForeground="#ffffff",
        accent=primary,
        accentForeground="#ffffff",
        appearanceDefault="SYSTEM",
    )
    for index, (slug, primary) in enumerate(
        (
            ("fumep", "#143d70"),
            ("etmsl", "#165c51"),
            ("cramam", "#713946"),
        )
    )
}
