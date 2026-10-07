from fastapi import FastAPI, HTTPException, Path, Response

from .fixtures import PUBLIC_THEMES
from .schemas import HealthResponse, PublicInstitutionTheme
from .auth_http import admin_router, router as auth_router
from .categories_http import router as categories_router
from .galleries_http import router as galleries_router
from .page_templates_http import router as page_templates_router

app = FastAPI(title="Portal FUMEP API", version="1.0.0-migration")
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(categories_router)
app.include_router(galleries_router)
app.include_router(page_templates_router)


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
