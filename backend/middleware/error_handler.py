"""
Global exception handlers, registered on the app in main.py.

Maps uncaught exceptions to clean JSON responses so clients never see a raw
500 HTML page:
  * ValueError   -> 400 (treated as a client/input error, message forwarded)
  * RuntimeError -> 500 (server-side failure, message forwarded)
  * Exception    -> 500 (generic; full traceback logged, details hidden from client)
"""
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def register_error_handlers(app: FastAPI):
    """Registers global exception handlers on the FastAPI app. Catches unhandled
    exceptions that slip past route-level try/except blocks and returns a clean
    JSON error instead of a raw 500 HTML page."""

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        """Invalid input / not-found style errors -> HTTP 400 with the message."""
        return JSONResponse(
            status_code=400,
            content={"detail": str(exc)},
        )

    @app.exception_handler(RuntimeError)
    async def runtime_error_handler(request: Request, exc: RuntimeError):
        """Server-side failures (e.g. missing artifact) -> HTTP 500 with the message."""
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        """Catch-all -> HTTP 500. Logs the full traceback; hides internals from the client."""
        # log the full traceback for debugging, but don't leak internals to the client
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected error occurred. Check server logs for details."},
        )
