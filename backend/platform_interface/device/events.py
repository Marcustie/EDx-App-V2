"""
Device event system for the platform interface.

This module provides an event system for device-related events that decouples
the business logic from the GUI. It allows components to publish events and
subscribe to them without direct dependencies.
"""

import logging
from dataclasses import dataclass
from enum import Enum, auto
from typing import Any, Callable, Dict, Set

log = logging.getLogger(__name__)


class EventType(Enum):
    """Types of events that can be published by devices."""

    # Data events
    DATA_POINT = auto()
    DATA_RESET = auto()
    DATA_ADD_DATASET = auto()

    # Script events
    SCRIPT_STARTED = auto()
    SCRIPT_COMPLETED = auto()

    # Connection events
    DEVICE_CONNECTED = auto()
    DEVICE_DISCONNECTED = auto()

    # Command events
    COMMAND_SENT = auto()
    COMMAND_RESPONSE = auto()


@dataclass
class Event:
    """
    Represents an event in the system.

    Attributes:
        type: The type of event
        device_id: The ID of the device that generated the event
        data: Optional data associated with the event
    """

    type: EventType
    device_id: str
    data: Any = None


class EventCallback:
    """
    Wrapper for event callbacks to handle different callback types.

    This class allows both synchronous and asynchronous callbacks to be used
    with the event system.
    """

    def __init__(self, callback: Callable):
        """
        Initialize the callback wrapper.

        Args:
            callback: The callback function to wrap
        """
        self.callback = callback

    async def __call__(self, event: Event) -> None:
        """
        Call the wrapped callback with the event.

        Args:
            event: The event to pass to the callback
        """
        import asyncio

        if asyncio.iscoroutinefunction(self.callback):
            await self.callback(event)
        else:
            self.callback(event)


class EventBus:
    """
    Central event bus for publishing and subscribing to events.

    This class provides methods for components to publish events and
    subscribe to specific event types.
    """

    def __init__(self):
        """Initialize the event bus with empty subscriber lists."""
        self._subscribers: Dict[EventType, Set[EventCallback]] = {
            event_type: set() for event_type in EventType
        }

    def subscribe(self, event_type: EventType, callback: Callable) -> None:
        """
        Subscribe to a specific event type.

        Args:
            event_type: The type of event to subscribe to
            callback: The function to call when an event of this type is published
        """
        self._subscribers[event_type].add(EventCallback(callback))
        log.debug(
            f"Subscribed to {event_type.name}, total subscribers: {len(self._subscribers[event_type])}"
        )

    def unsubscribe(self, event_type: EventType, callback: Callable) -> None:
        """
        Unsubscribe from a specific event type.

        Args:
            event_type: The type of event to unsubscribe from
            callback: The callback function to remove
        """
        # Find the matching EventCallback wrapper
        to_remove = None
        for subscriber in self._subscribers[event_type]:
            if subscriber.callback == callback:
                to_remove = subscriber
                break

        if to_remove:
            self._subscribers[event_type].remove(to_remove)
            log.debug(
                f"Unsubscribed from {event_type.name}, remaining subscribers: {len(self._subscribers[event_type])}"
            )
        else:
            log.warning(
                f"Attempted to unsubscribe a callback that was not subscribed to {event_type.name}"
            )

    async def publish(self, event: Event) -> None:
        """
        Publish an event to all subscribers.

        Args:
            event: The event to publish
        """
        log.debug(f"Publishing event: {event.type.name} for device {event.device_id}")

        for subscriber in list(self._subscribers[event.type]):
            try:
                await subscriber(event)
            except Exception as e:
                log.exception(f"Error in event subscriber: {e}")


# Global event bus instance
event_bus = EventBus()
