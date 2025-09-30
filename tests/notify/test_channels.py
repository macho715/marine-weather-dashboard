from __future__ import annotations

from email.message import EmailMessage
from email.message import EmailMessage
from typing import List

import httpx

from wv.notify.email import EmailNotifier, send_email
from wv.notify.manager import NotificationManager
from wv.notify.slack import SlackNotifier, send_slack
from wv.notify.telegram import TelegramNotifier, send_telegram


class DummySMTP:
    def __init__(self) -> None:
        self.sent: List[EmailMessage] = []

    def send_message(self, message: EmailMessage) -> None:
        self.sent.append(message)


def test_email_notifier_sends_message() -> None:
    smtp = DummySMTP()
    notifier = EmailNotifier(
        smtp_client=smtp,
        sender="ops@example.com",
        recipients=["captain@example.com"],
    )
    notifier.send("Route MW4-AGI", "Hs 1.20 m, Wind 12.00 kt")
    assert len(smtp.sent) == 1
    assert smtp.sent[0]["Subject"] == "Route MW4-AGI"


def test_slack_notifier_posts_message() -> None:
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = request.content.decode()
        return httpx.Response(status_code=200)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    notifier = SlackNotifier(webhook_url="https://hooks.slack.com/test", client=client)
    notifier.send("Alert", "Hs 3.10 m")
    assert "Hs 3.10 m" in captured["body"]


def test_telegram_notifier_posts_message() -> None:
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(status_code=200)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    notifier = TelegramNotifier(bot_token="token", chat_id="123", client=client)
    notifier.send("Alert", "Wind 28.00 kt")
    assert "sendMessage" in captured["url"]


def test_notification_manager_dispatches_all_channels() -> None:
    smtp = DummySMTP()
    slack_body: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        slack_body["body"] = request.content.decode()
        return httpx.Response(status_code=200)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    manager = NotificationManager(
        channels=[
            EmailNotifier(
                smtp_client=smtp, sender="ops@example.com", recipients=["captain@example.com"]
            ),
            SlackNotifier(webhook_url="https://hooks.slack.com/test", client=client),
        ]
    )
    manager.send_all("Alert", "Combined alert")
    assert smtp.sent
    assert "Combined alert" in slack_body["body"]


def test_send_email_helper_uses_smtp() -> None:
    smtp = DummySMTP()
    send_email("Status body", ["ops@example.com"], subject="Status", smtp_client=smtp)
    assert len(smtp.sent) == 1
    assert smtp.sent[0]["Subject"] == "Status"


def test_send_slack_helper_posts(monkeypatch) -> None:
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = request.content.decode()
        return httpx.Response(status_code=200)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    send_slack("Payload", title="Alert", webhook_url="https://hooks.slack.com/test", client=client)
    assert "Payload" in captured["body"]


def test_send_telegram_helper_posts(monkeypatch) -> None:
    captured: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        return httpx.Response(status_code=200)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    send_telegram(
        "Body",
        title="Alert",
        bot_token="token",
        chat_id="123",
        client=client,
    )
    assert "sendMessage" in captured["url"]
