"""텔레그램 알림 모듈. | Telegram notification module."""

from __future__ import annotations

import logging
import os

import httpx

from wv.notify.manager import NotificationChannel

LOGGER = logging.getLogger("wv.notify.telegram")


class TelegramNotifier(NotificationChannel):
    """텔레그램 봇 발송기. | Telegram bot sender."""

    def __init__(self, bot_token: str, chat_id: str, client: httpx.Client | None = None) -> None:
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.client = client or httpx.Client()
        self._owns_client = client is None

    def __del__(self) -> None:  # pragma: no cover - cleanup path
        if getattr(self, "_owns_client", False):
            self.client.close()

    def send(self, title: str, message: str) -> None:
        """텔레그램으로 메시지를 발송. | Send message to Telegram."""

        base_url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": f"{title}\n{message}",
            "parse_mode": "Markdown",
        }
        response = self.client.post(base_url, data=payload, timeout=10)
        if response.status_code >= 400:
            raise RuntimeError(f"Telegram notification failed: {response.status_code}")


def send_telegram(
    message: str,
    *,
    title: str | None = None,
    bot_token: str | None = None,
    chat_id: str | None = None,
    dry_run: bool = False,
    client: httpx.Client | None = None,
) -> None:
    """텔레그램 알림 전송. Send Telegram notification."""

    token = bot_token or os.getenv("WV_TELEGRAM_BOT_TOKEN", "")
    chat = chat_id or os.getenv("WV_TELEGRAM_CHAT_ID", "")
    if not token or not chat:
        LOGGER.info("Telegram credentials not configured; skipping message")
        return
    notifier = TelegramNotifier(bot_token=token, chat_id=chat, client=client)
    if dry_run:
        LOGGER.info("Dry-run Telegram: %s", message)
        return
    notifier.send(title or "Weather Vessel Update", message)


__all__ = ["TelegramNotifier", "send_telegram"]
