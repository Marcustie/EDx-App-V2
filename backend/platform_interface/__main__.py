import logging

from platform_interface.event_loop import run_loop, create_loop
from platform_interface.exceptions import GuiError, AsyncError, AppError

log = logging.getLogger(__name__)


def main():
    try:
        log.debug("creating main loop")
        loop = create_loop()
    except GuiError:
        raise
    except AsyncError:
        raise
    except Exception:
        e = "unhandled exception while creating app"
        log.exception(e)
        raise AppError(e)

    try:
        log.debug("running main loop")
        run_loop(loop)
        log.debug("finished main loop")
    except AppError:
        raise
    except Exception:
        e = "unhandled exception in main loop, quitting app"
        log.exception(e)
        raise AppError(e)


if __name__ == "__main__":
    try:
        main()
    except AppError:
        log.critical("unhandled App exception, closing app")
    except GuiError:
        log.critical("unhandled GUI exception, closing app")
    except AsyncError:
        log.critical("unhandled Async exception, closing app")
    except Exception:
        log.exception("unhandled exception, closing app")
