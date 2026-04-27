"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from phoneme_navigator.api.routes import router
from phoneme_navigator.core.config import get_settings
from phoneme_navigator.core.logging import (
    clear_request_id,
    configure_logging,
    set_request_id,
)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    process_logger = configure_logging(settings.logging_config, "backend.log")

    app = FastAPI(title="Phoneme Navigator Backend", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)

    logger = logging.getLogger(__name__)
    process_logger.info(
        "Backend application created.",
        extra={
            "app_env": settings.app_env,
            "frontend_origin": settings.frontend_origin,
            "kokoro_base_url": settings.kokoro_base_url,
        },
    )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):  # type: ignore[override]
        request_id = set_request_id(request.headers.get("x-request-id"))
        started_at = time.perf_counter()
        logger.info(
            "Request started.",
            extra={
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query),
                "client": request.client.host if request.client else None,
            },
        )
        try:
            response = await call_next(request)
        finally:
            duration_ms = (time.perf_counter() - started_at) * 1000.0
            logger.info(
                "Request finished.",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                    "request_id": request_id,
                },
            )
            clear_request_id()

        response.headers["x-request-id"] = request_id
        return response

    return app


app = create_app()
