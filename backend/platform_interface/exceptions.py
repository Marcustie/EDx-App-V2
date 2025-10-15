"""
Custom exceptions for the platform interface.

This module defines exception classes used throughout the application to
provide more specific error information and enable targeted exception handling.
Each exception type corresponds to a specific category of errors that can occur
during application execution.
"""


class GuiError(Exception):
    """
    Exception raised for errors related to the GUI components.

    This exception is used when there are problems creating, initializing,
    or interacting with GUI elements of the application.
    """

    pass


class AsyncError(Exception):
    """
    Exception raised for errors related to asynchronous operations.

    This exception is used when there are problems with the event loop,
    coroutines, or other asynchronous functionality.
    """

    pass


class AppError(Exception):
    """
    Exception raised for general application errors.

    This exception is used for high-level application errors that don't
    fit into more specific categories, often representing fatal conditions
    that require application termination.
    """

    pass
