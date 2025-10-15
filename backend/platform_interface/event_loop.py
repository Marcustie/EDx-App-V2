"""
Event loop module for the platform interface.

This module provides functionality for creating and running the application's
event loop, which integrates Qt's event system with Python's asyncio. It handles:
- Creating the Qt application and event loop
- Setting up error handling for the event loop
- Auto-connecting to devices if configured
- Running the event loop with proper exception handling
"""

import asyncio
import logging
import sys

from qasync import QEventLoop

from platform_interface import settings
from platform_interface.exceptions import GuiError, AsyncError, AppError
from platform_interface.gui.app import App

log = logging.getLogger(__name__)


def create_loop():
    """
    Create and initialize the application event loop.

    This function:
    1. Creates the Qt application instance
    2. Creates a QEventLoop that integrates Qt with asyncio
    3. Sets this loop as the default asyncio event loop
    4. If auto_connect is enabled in settings, schedules device connection

    Returns:
        QEventLoop: The initialized event loop ready to be run

    Raises:
        GuiError: If there's an error creating the GUI application
        AsyncError: If there's an error creating the event loop
    """
    try:
        app = App(sys.argv)
    except Exception:
        e = "unhandled exception while creating GUI"
        log.exception(e)
        raise GuiError(e)
    try:
        loop = QEventLoop(app)
        asyncio.set_event_loop(loop)
    except Exception:
        e = "unhandled exception while creating event loop"
        log.exception(e)
        raise AsyncError(e)

    if settings.auto_connect:
        connect_coro = app.main_window._device_widget._connect_tab._connect_all()
        loop.call_later(0, lambda: asyncio.ensure_future(connect_coro))

    return loop


def run_loop(loop: QEventLoop):
    """
    Run the application event loop.

    This function starts the event loop and keeps it running until the application
    is closed or an unhandled exception occurs.

    Args:
        loop: The QEventLoop instance to run

    Raises:
        AppError: If an unhandled exception occurs in the event loop
    """
    try:
        loop.run_forever()
    except Exception:
        e = "unhandled exception in async loop, quitting app"
        log.exception(e)
        raise AppError(e)


__all__ = ["run_loop", "create_loop"]
