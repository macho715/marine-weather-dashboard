"""Slack 알림 모듈. | Slack notification module."""

from __future__ import annotations

import logging
import os

import httpx

from wv.notify.manager import NotificationChannel

LOGGER = logging.getLogger("wv.notify.slack")


class SlackNotifier(NotificationChannel):
    """Slack 웹훅 발송기. | Slack webhook sender."""

    def __init__(self, webhook_url: str, client: httpx.Client | None = None) -> None:
        self.webhook_url = webhook_url
        self.client = client or httpx.Client()
        self._owns_client = client is None

    def __del__(self) -> None:  # pragma: no cover - cleanup path
        if getattr(self, "_owns_client", False):
            self.client.close()

    def send(self, title: str, message: str) -> None:
        """Slack으로 메시지를 발송. | Send message to Slack."""

        payload = {"text": f"*{title}*\n{message}"}
        response = self.client.post(self.webhook_url, json=payload, timeout=10)
        if response.status_code >= 400:
            raise RuntimeError(f"Slack notification failed: {response.status_code}")


def send_slack(
    message: str,
    *,
    title: str | None = None,
    webhook_url: str | None = None,
    dry_run: bool = False,
    client: httpx.Client | None = None,
) -> None:
    """슬랙 알림 전송. Send Slack notification."""

    url = webhook_url or os.getenv("WV_SLACK_WEBHOOK", "")
    if not url:
        LOGGER.info("Slack webhook not configured; skipping message")
        return
    notifier = SlackNotifier(webhook_url=url, client=client)
    if dry_run:
        LOGGER.info("Dry-run Slack: %s", message)
        return
    notifier.send(title or "Weather Vessel Update", message)


__all__ = ["SlackNotifier", "send_slack"]
