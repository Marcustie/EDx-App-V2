"""
Configuration module for the platform interface.

This module provides configuration management for the application, including:
- Default settings via the Settings class
- Loading and saving user settings
- Path management for various application directories
- JSON configuration file handling
"""

import json
import logging
from pathlib import Path

import platformdirs
from pydantic_settings import BaseSettings, SettingsConfigDict

log = logging.getLogger(__name__)


class Settings(BaseSettings):
    """
    Application settings configuration class.

    This class defines all configurable settings for the platform interface application,
    including GUI settings, file paths, logging configuration, API credentials,
    AWS S3 settings, and device communication parameters.

    All settings have default values that can be overridden by user configuration.
    """

    # gui settings
    main_window_width: int = 1100
    main_window_height: int = 680
    auto_switch_tab: bool = True
    command_history_max_lines: int = 100

    # files
    metadata_path: str = "metadata.json"
    script_path: str = "script.txt"
    command_history_file: str = ".command_history"
    app_root: str = str(
        Path(
            platformdirs.user_data_dir(
                appname="platform-interface", appauthor="ElectraDx"
            )
        )
    )
    settings_file: str = "settings.json"
    root_folder: str = str(Path.home() / "ElectraDx" / "platform-interface")
    script_root: str = ""
    metadata_root: str = ""

    # logging
    log_file_name: str = "app.log"
    log_level: str = "DEBUG"
    assay_file_log_format: str = "%(message)s"
    assay_log_root: str = ""

    # API settings
    api_key: str = ""
    user_id: str = ""

    # AWS S3 settings
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = ""
    aws_s3_bucket_path: str = ""

    # device
    baudrate: int = 115200
    script_timeout: int | float = 60 * 60  # seconds
    auto_connect: bool = True
    show_full_device_output: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# Create default settings
settings = Settings()


def update_path_settings():
    """
    Update path settings based on root_folder.

    This function sets the paths for scripts, metadata, and logs directories
    based on the current root_folder setting. It ensures that all path-related
    settings are consistent with the root folder configuration.

    The function is called automatically when settings are loaded and should be
    called whenever the root_folder setting is changed.
    """
    # Always update paths when root_folder changes, regardless of current values
    settings.script_root = str(Path(settings.root_folder) / "scripts")
    settings.metadata_root = str(Path(settings.root_folder) / "metadata")
    settings.assay_log_root = str(Path(settings.root_folder) / "logs")


# Load user settings from settings.json if it exists
def load_user_settings():
    """
    Load user settings from the settings file.

    This function attempts to load user settings from the settings.json file
    located in the application root directory. If the file exists, it reads
    the settings and updates the global settings object with the user values.

    The function maps GUI setting names to configuration setting names and
    only updates settings that exist in both the file and the Settings class.

    After loading settings, it calls update_path_settings() to ensure path
    settings are consistent with the root folder.

    If an error occurs during loading, it logs the exception but continues
    execution with default settings.
    """
    settings_path = Path(settings.app_root) / settings.settings_file
    if settings_path.exists():
        try:
            with settings_path.open("r") as file:
                user_settings = json.load(file)

                # Map GUI setting names to config setting names
                mapping = {
                    "API key": "api_key",
                    "User ID": "user_id",
                    "AWS Access Key ID": "aws_access_key_id",
                    "AWS Secret Access Key": "aws_secret_access_key",
                    "AWS S3 Bucket": "aws_s3_bucket",
                    "AWS S3 Bucket Path": "aws_s3_bucket_path",
                    "Root Folder": "root_folder",
                    "Command History Max Lines": "command_history_max_lines",
                    "Show Full Device Output": "show_full_device_output",
                }

                # Update settings with user values
                for gui_key, config_key in mapping.items():
                    if gui_key in user_settings and hasattr(settings, config_key):
                        # Convert string to boolean for boolean settings
                        if config_key == "show_full_device_output":
                            value = user_settings[gui_key]
                            if isinstance(value, str):
                                bool_value = value.lower() in ["true", "yes", "1", "on"]
                                setattr(settings, config_key, bool_value)
                            else:
                                setattr(settings, config_key, bool(value))
                        else:
                            setattr(settings, config_key, user_settings[gui_key])

                log.info("Loaded user settings from %s", settings_path)
        except Exception as e:
            log.exception("Error loading user settings: %s", e)

    update_path_settings()


# Load user settings at startup
load_user_settings()


class JsonConfigManager:
    """
    Handles loading and saving configuration data to a JSON file.

    This class provides a simple interface for reading from and writing to
    JSON configuration files, with error handling and proper file management.
    """

    def __init__(self, file: Path):
        """
        Initialize the JSON configuration manager.

        Args:
            file (Path): The path to the JSON configuration file.
        """
        self.settings_file = file

    def load(self) -> dict:
        """
        Load data from the JSON file and return as a dictionary.

        Returns:
            dict: The loaded configuration data, or an empty dictionary if
                  the file doesn't exist or cannot be loaded.
        """
        if self.settings_file.exists():
            with self.settings_file.open("r") as file:
                return json.load(file)

        return {}

    def save(self, data: dict) -> None:
        """
        Save a dictionary to the JSON file.

        Args:
            data (dict): The configuration data to save.
        """
        with self.settings_file.open("w") as file:
            json.dump(data, file, indent=4)


__all__ = ["settings", "JsonConfigManager", "update_path_settings"]
