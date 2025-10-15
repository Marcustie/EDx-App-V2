"""
Platform Interface Package.

This package provides the core functionality for the data pipeline platform interface,
including device communication, GUI components, and configuration management.
It handles initialization of logging, directory structure, and fault handling.
"""

import logging
from pathlib import Path
import faulthandler

from platform_interface.config import settings
from platform_interface.logger import setup_logging

try:
    faulthandler.enable()
except Exception:
    pass

if not Path(settings.app_root).exists():
    Path(settings.app_root).mkdir(parents=True)

if not Path(settings.script_root).exists():
    Path(settings.script_root).mkdir(parents=True)

if not Path(settings.assay_log_root).exists():
    Path(settings.assay_log_root).mkdir(parents=True)

if not Path(settings.metadata_root).exists():
    Path(settings.metadata_root).mkdir(parents=True)

setup_logging()

log = logging.getLogger(__name__)
log.info("loading platform_interface")

__all__ = []
