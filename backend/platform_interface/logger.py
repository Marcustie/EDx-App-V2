"""
Logging module for the platform interface.

This module provides custom logging functionality for the application, including:
- JSON-formatted logs for file output
- Colored console output
- Integration with Qt GUI components for displaying logs
- Log filtering capabilities
- Centralized logging configuration

The module sets up both file and console logging handlers with appropriate
formatters and filters.
"""

import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import TYPE_CHECKING
import traceback

from colorama import Fore, Style

from platform_interface.config import settings

if TYPE_CHECKING:
    from platform_interface.gui.widgets import LogViewer


class JSONFormatter(logging.Formatter):
    """
    Custom formatter that outputs log records as JSON objects.

    This formatter converts standard Python logging records into JSON-formatted
    strings, making them easier to parse and analyze with external tools.
    Each log entry includes timestamp, message, level, and module information.
    If an exception is present, its traceback is also included.
    """

    def format(self, record) -> str:
        """
        Format a log record as a JSON string.

        Args:
            record: The log record to format.

        Returns:
            str: A JSON string representation of the log record.
        """
        log_record = {
            "t": self.formatTime(record, self.datefmt),
            "p": record.getMessage(),
            "l": record.levelname,
            "m": record.name,
        }

        # Add traceback if present
        if record.exc_info:
            import traceback

            log_record["traceback"] = "".join(
                traceback.format_exception(*record.exc_info)
            )

        return json.dumps(log_record)


class ColorFormatter(logging.Formatter):
    """
    Custom formatter that adds color to console log output.

    This formatter enhances console readability by color-coding log messages
    based on their severity level. Different colors are used for different
    log levels (debug, info, warning, error, critical) to provide visual cues
    about message importance.

    If an exception traceback is present, it will be included in the output.
    """

    COLOR_MAP = {
        "DEBUG": Fore.CYAN,
        "INFO": Fore.GREEN,
        "WARNING": Fore.YELLOW,
        "ERROR": Fore.RED,
        "CRITICAL": Fore.RED + Style.BRIGHT,
    }

    def format(self, record: logging.LogRecord) -> str:
        """
        Format a log record with appropriate colors.

        Args:
            record: The log record to format.

        Returns:
            str: A colored string representation of the log record.
        """
        color = self.COLOR_MAP.get(record.levelname, Fore.WHITE)
        base = "%s: %s - %s" % (record.levelname, record.name, record.getMessage())

        if record.exc_info:
            tb = "".join(traceback.format_exception(*record.exc_info))
            base += "\n%s" % tb.strip()

        return "%s%s%s" % (color, base, Style.RESET_ALL)


class QtLogHandler(logging.Handler):
    """
    Custom logging handler that sends log messages to a Qt LogViewer widget.

    This handler bridges the Python logging system with the Qt GUI by forwarding
    formatted log messages to a LogViewer widget for display. It can be configured
    with custom formatters and filters to control the appearance and content of
    log messages in the GUI.
    """

    def __init__(
        self,
        log_viewer: "LogViewer",
        level: int = logging.DEBUG,
        log_filter: logging.Filter | None = None,
        formatter: logging.Formatter | None = None,
    ) -> None:
        """
        Initialize the Qt log handler.

        Args:
            log_viewer: The LogViewer widget to send log messages to.
            level: The minimum logging level to handle.
            log_filter: Optional filter to apply to log records.
            formatter: Optional formatter to format log records.
        """
        super().__init__(level)
        self.log_viewer = log_viewer
        if formatter:
            self.setFormatter(formatter)
        if log_filter:
            self.addFilter(log_filter)

    def emit(self, record: logging.LogRecord) -> None:
        """
        Format and send a log message to the LogViewer widget.

        Args:
            record: The log record to emit.
        """
        msg = self.format(record)
        self.log_viewer.append_message(msg)


class NoTracebackFilter(logging.Filter):
    """
    Filter that removes tracebacks from log records before they reach the GUI handler.

    This filter is useful for keeping the GUI log display clean and focused on
    essential information, while still allowing full traceback information to be
    preserved in file logs. It temporarily removes exception information from
    log records as they pass through the filter.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        """
        Remove traceback information from a log record.

        This method stores the original exception info and then removes it from
        the record. The original information is preserved in case it's needed later.

        Args:
            record: The log record to filter.

        Returns:
            bool: Always returns True to allow the record to be processed.
        """
        self._original_exc_info = record.exc_info

        if record.exc_info:
            record.exc_info = None

        return True


def setup_logging():
    """
    Configure logging for the application.

    This function sets up the application's logging system with:
    - A rotating file handler that writes JSON-formatted logs
    - A console handler with colored output
    - Basic configuration including log level from settings
    - Reduced verbosity for certain third-party libraries

    The function should be called once at application startup to initialize
    the logging system. It uses settings from the application configuration
    to determine log file location and logging level.
    """
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    log_file = Path(settings.app_root) / settings.log_file_name
    file_handler = RotatingFileHandler(
        log_file,
        mode="a",
        maxBytes=5 * 1024 * 1024,
        backupCount=1,
        encoding="utf8",
    )
    file_handler.setFormatter(JSONFormatter())
    file_handler.setLevel(logging.DEBUG)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(ColorFormatter())
    logging.basicConfig(
        level=settings.log_level,
        format=log_format,
        handlers=[file_handler, console_handler],
    )
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.info("logging to %s", log_file)
