"""
Worker module for handling asynchronous tasks in the platform interface.

This module provides classes for executing asynchronous tasks in the background
while maintaining communication with the main application thread. It includes:
- Error handling and reporting via signals
- Progress updates during task execution
- Setup and cleanup functions for tasks
- Support for both synchronous and asynchronous callback functions

The module is designed to work with PyQt's signal/slot mechanism to ensure
thread-safe communication between background tasks and the GUI.
"""

import asyncio
import sys
import traceback
import inspect
from typing import Any, Optional, Callable, Union, Awaitable

from PyQt6.QtCore import QObject, pyqtSignal
from pydantic import BaseModel


class WorkerError(BaseModel):
    """
    Model for worker task errors.

    This class encapsulates error information when a worker task fails,
    including the exception type, value, and traceback. It is used to
    pass structured error data through PyQt signals.

    Attributes:
        exception (str): The name of the exception that occurred.
        value (Any): The exception instance or error value.
        traceback (str): The formatted traceback string.
    """

    exception: str
    value: Any
    traceback: str


class WorkerSignals(QObject):
    """
    Defines signals available for worker communication.

    This class provides a set of PyQt signals that workers use to communicate
    with the main application thread. These signals handle various events
    in the worker lifecycle, including setup, completion, errors, results,
    and progress updates.

    Signals:
        setup: Emitted when the worker is about to start.
        finished: Emitted when the worker has completed, regardless of result.
        error: Emitted when an error occurs, with WorkerError data.
        result: Emitted with the return value when the worker completes successfully.
        progress: Emitted to provide updates during worker execution.
    """

    setup = pyqtSignal()
    finished = pyqtSignal()
    error = pyqtSignal(WorkerError)
    result = pyqtSignal(object)
    progress = pyqtSignal(object)


class AsyncWorker(QObject):
    """
    Worker class for executing asynchronous coroutines.

    This class allows running asynchronous functions (coroutines) as background
    tasks while providing signals for communication with the main application thread.
    It handles execution, error reporting, and result delivery.
    """

    def __init__(self, coro: callable, *args, **kwargs) -> None:
        """
        Initialize an AsyncWorker with a coroutine to execute.

        Args:
            coro: An async function (coroutine) to be executed.
            *args: Positional arguments to pass to the coroutine.
            **kwargs: Keyword arguments to pass to the coroutine.

        Note:
            If the coroutine supports a 'progress_callback' parameter,
            this will be automatically set to self.progress.emit.
        """
        super().__init__()
        self.signals = WorkerSignals()
        self.coro = coro
        self.args = args
        self.kwargs = kwargs

        self.setup_fn = None
        self.finished_fn = None
        self.result_fn = None

    def start(self):
        """
        Start the worker execution.

        This method emits the setup signal and schedules the async task
        for execution. If a setup function is provided, it will be called
        before the main task starts.

        If the setup function is a coroutine, it will be awaited before
        the main task starts.
        """
        # self.signals.setup.emit()
        if self.setup_fn:
            try:
                if inspect.iscoroutinefunction(self.setup_fn):
                    setup_task = asyncio.create_task(self.setup_fn())
                    setup_task.add_done_callback(
                        lambda _: asyncio.create_task(self._run())
                    )
                else:
                    self.setup_fn()
                    asyncio.create_task(self._run())
            except Exception:
                exctype, value = sys.exc_info()[:2]

                worker_error = WorkerError(
                    exception=exctype.__name__,
                    value=value,
                    traceback=traceback.format_exc(),
                )
                self.signals.error.emit(worker_error)
                raise
        else:
            asyncio.create_task(self._run())

    async def _run(self):
        """
        Internal method that executes the coroutine and handles results and errors.

        This method:
        1. Executes the coroutine with the provided arguments
        2. Catches any exceptions and emits them as error signals
        3. Processes the result through the result function if provided
        4. Calls the finished function and emits the finished signal

        The method handles both synchronous and asynchronous callback functions
        for result and finished handlers.
        """
        try:
            result = await self.coro(*self.args, **self.kwargs)
        except Exception:
            exctype, value = sys.exc_info()[:2]

            worker_error = WorkerError(
                exception=exctype.__name__,
                value=value,
                traceback=traceback.format_exc(),
            )
            self.signals.error.emit(worker_error)
        else:
            if self.result_fn:
                if inspect.iscoroutinefunction(self.result_fn):
                    await self.result_fn(result)
                else:
                    self.signals.result.emit(result)
        finally:
            if self.finished_fn:
                if inspect.iscoroutinefunction(self.finished_fn):
                    await self.finished_fn()
                else:
                    self.finished_fn()
            self.signals.finished.emit()


class Worker(AsyncWorker):
    """
    Enhanced worker class with callback function support.

    This class extends AsyncWorker to provide a more convenient interface for
    setting up callback functions for various worker events (setup, finished,
    error, result, progress). It automatically connects these callbacks to
    the appropriate signals.

    This is the recommended worker class for most use cases in the application.
    """

    def __init__(
        self,
        fn: callable,
        setup_fn: Optional[
            Union[Callable[[], None], Callable[[], Awaitable[None]]]
        ] = None,
        finished_fn: Optional[
            Union[Callable[[], None], Callable[[], Awaitable[None]]]
        ] = None,
        error_fn: Optional[callable] = None,
        result_fn: Optional[callable] = None,
        progress_fn: Optional[callable] = None,
        *args: object,
        **kwargs: object,
    ) -> None:
        """
        Initialize a Worker with a function and optional callbacks.

        Args:
            fn: The function or coroutine to execute.
            setup_fn: Optional function to call before the worker starts.
            finished_fn: Optional function to call when the worker finishes.
            error_fn: Optional function to call when an error occurs.
            result_fn: Optional function to call with the result.
            progress_fn: Optional function to call for progress updates.
            *args: Positional arguments to pass to the function.
            **kwargs: Keyword arguments to pass to the function.

        Both synchronous functions and coroutines are supported for all callbacks.
        """
        super().__init__(fn, *args, **kwargs)
        self.result_fn = None
        if setup_fn:
            self.signals.setup.connect(lambda: None)
            self.setup_fn = setup_fn
        if finished_fn:
            self.signals.finished.connect(lambda: None)
            self.finished_fn = finished_fn
        if error_fn:
            self.signals.error.connect(error_fn)
        if result_fn:
            self.signals.result.connect(result_fn)
            self.result_fn = result_fn
        if progress_fn:
            self.signals.progress.connect(progress_fn)
