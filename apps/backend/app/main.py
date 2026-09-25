from fastapi import FastAPI, HTTPException, Path, Response

from .fixtures import PUBLIC_THEMES
from .schemas import HealthResponse, PublicInstitutionTheme

app = FastAPI(title="Portal FUMEP API", version="1.0.0-migration")


@app.get("/api/v1/health", response_model=HealthResponse, tags=["health"])
def get_health(response: Response) -> HealthResponse:
    """Liveness only: no database, Redis, storage or internal diagnostics."""
    response.headers["Cache-Control"] = "no-store"
    return HealthResponse(status="ok")


@app.get(
    "/api/v1/public/institutions/{slug}/theme",
    response_model=PublicInstitutionTheme,
    tags=["public themes"],
    responses={404: {"description": "Institution not found"}},
)
def get_public_theme(
    response: Response,
    slug: str = Path(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100),
) -> PublicInstitutionTheme:
    """Public fixture projection; not yet integrated with PostgreSQL or Nuxt."""
    theme = PUBLIC_THEMES.get(slug)
    if theme is None:
        raise HTTPException(status_code=404, detail="Institution not found")
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-FUMEP-Data-Source"] = "fixture"
    return theme
