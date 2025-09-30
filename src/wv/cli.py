"""웨더 베슬 CLI. | Weather Vessel command line interface."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Sequence

import typer
from dotenv import load_dotenv

from wv.core.cache import CacheRepository
from wv.core.models import ForecastPoint, RiskLevel
from wv.core.repository import RouteRepository
from wv.core.risk import compute_risk
from wv.notify.email import EmailNotifier, send_email
from wv.notify.manager import NotificationManager
from wv.notify.slack import SlackNotifier, send_slack
from wv.notify.telegram import TelegramNotifier, send_telegram
from wv.providers.factory import create_providers
from wv.services.marine import MarineForecastService
from wv.services.scheduler import VoyageScheduler

load_dotenv()

logging.basicConfig(level=os.getenv("WV_LOG_LEVEL", "INFO"))
LOGGER = logging.getLogger("wv.cli")

app = typer.Typer(help="Weather Vessel marine scheduling CLI")

_route_repo = RouteRepository()

RISK_ORDER = {RiskLevel.LOW: 0, RiskLevel.MEDIUM: 1, RiskLevel.HIGH: 2}


@dataclass(slots=True)
class ServiceContainer:
    """서비스 의존성 컨테이너. | Service dependency container."""

    marine: MarineForecastService
    scheduler_service: VoyageScheduler
    notifier_manager: NotificationManager

    def marine_service(self) -> MarineForecastService:
        """해양 서비스 제공. Provide marine service."""

        return self.marine

    def scheduler(self) -> VoyageScheduler:
        """스케줄러 제공. Provide scheduler."""

        return self.scheduler_service

    def notifier(self) -> NotificationManager:
        """알림 매니저 제공. Provide notification manager."""

        return self.notifier_manager


def build_service_container() -> ServiceContainer:
    """서비스 컨테이너 생성. Build service container."""

    providers = list(create_providers())
    cache = CacheRepository()
    marine_service = MarineForecastService(providers=providers, cache=cache)
    output_dir = Path(os.getenv("WV_OUTPUT_DIR", "outputs"))
    scheduler = VoyageScheduler(marine_service=marine_service, output_dir=output_dir)

    channels: list = []
    recipients = _default_recipients()
    if recipients:
        channels.append(EmailNotifier(recipients=recipients))
    slack_url = os.getenv("WV_SLACK_WEBHOOK")
    if slack_url:
        channels.append(SlackNotifier(webhook_url=slack_url))
    telegram_token = os.getenv("WV_TELEGRAM_BOT_TOKEN")
    telegram_chat = os.getenv("WV_TELEGRAM_CHAT_ID")
    if telegram_token and telegram_chat:
        channels.append(TelegramNotifier(bot_token=telegram_token, chat_id=telegram_chat))

    notifier = NotificationManager(channels=channels)
    return ServiceContainer(marine=marine_service, scheduler_service=scheduler, notifier_manager=notifier)


def _resolve_coordinates(
    route: Optional[str], lat: Optional[float], lon: Optional[float]
) -> tuple[float, float, str]:
    """좌표 계산. Resolve coordinates."""

    if route:
        route_obj = _route_repo.get(route)
        head = route_obj.points[0]
        return head[0], head[1], route_obj.name
    if lat is None or lon is None:
        raise typer.BadParameter("Latitude and longitude are required when route is omitted")
    return lat, lon, "custom"


def _assess(points: Sequence[ForecastPoint]):
    """위험 평가 수행. Perform risk assessment."""

    if not points:
        raise typer.BadParameter("No forecast points available")
    assessments = [compute_risk(point) for point in points]
    assessments.sort(key=lambda item: RISK_ORDER[item.level], reverse=True)
    return assessments[0]


@app.command()
def check(
    now: bool = typer.Option(False, "--now", help="Print route metadata"),
    lat: Optional[float] = typer.Option(None, help="Latitude in decimal degrees"),
    lon: Optional[float] = typer.Option(None, help="Longitude in decimal degrees"),
    route: Optional[str] = typer.Option(None, help="Route code, e.g. MW4-AGI"),
    hours: int = typer.Option(48, help="Forecast horizon in hours"),
) -> None:
    """즉시 위험 평가. Immediate risk assessment."""

    container = build_service_container()
    lat_val, lon_val, route_name = _resolve_coordinates(route, lat, lon)
    points = container.marine_service().get_forecast(lat=lat_val, lon=lon_val, hours=hours)
    assessment = _assess(points)
    typer.echo(f"Risk Level: {assessment.level.value}")
    typer.echo(f"Max Hs: {assessment.metrics.max_wave_height:.2f} m")
    typer.echo(f"Max Wind: {assessment.metrics.max_wind_speed:.2f} kt")
    typer.echo("Reasons:")
    for reason in assessment.reasons:
        typer.echo(f"- {reason}")
    if now:
        typer.echo(f"Route: {route_name}")


@app.command()
def schedule(
    week: bool = typer.Option(False, "--week", help="Produce 7-day schedule"),
    route: Optional[str] = typer.Option(None, help="Route code"),
    lat: Optional[float] = typer.Option(None, help="Latitude in decimal degrees"),
    lon: Optional[float] = typer.Option(None, help="Longitude in decimal degrees"),
    vessel_speed: Optional[float] = typer.Option(None, help="Vessel speed in knots"),
    route_distance: Optional[float] = typer.Option(None, help="Route distance in NM"),
    cargo_hs_limit: Optional[float] = typer.Option(None, help="Cargo handling Hs limit in meters"),
) -> None:
    """주간 일정 생성. Generate weekly schedule."""

    if not week:
        raise typer.BadParameter("Only --week mode is supported")
    container = build_service_container()
    lat_val, lon_val, _route_name = _resolve_coordinates(route, lat, lon)
    scheduler = container.scheduler()
    table = scheduler.generate_weekly_schedule(
        lat=lat_val,
        lon=lon_val,
        vessel_speed=vessel_speed,
        route_distance_nm=route_distance,
        cargo_hs_limit=cargo_hs_limit,
    )
    typer.echo(table)
    typer.echo(f"CSV saved to {scheduler.output_dir / 'schedule_week.csv'}")
    typer.echo(f"ICS saved to {scheduler.output_dir / 'schedule_week.ics'}")


@app.command()
def notify(
    route: str = typer.Option("MW4-AGI", help="Route code"),
    vessel_speed: Optional[float] = typer.Option(None, help="Vessel speed in knots"),
    route_distance: Optional[float] = typer.Option(None, help="Route distance NM"),
    cargo_hs_limit: Optional[float] = typer.Option(None, help="Cargo Hs limit"),
    email_to: list[str] = typer.Option([], "--email-to", help="Email recipients"),
    slack: bool = typer.Option(False, help="Send Slack notification"),
    telegram: bool = typer.Option(False, help="Send Telegram notification"),
    dry_run: bool = typer.Option(False, help="Do not send notifications"),
) -> None:
    """알림 발송. Dispatch notifications."""

    container = build_service_container()
    route_obj = _route_repo.get(route)
    lat, lon = route_obj.points[0]
    scheduler = container.scheduler()
    table = scheduler.generate_weekly_schedule(
        lat=lat,
        lon=lon,
        vessel_speed=vessel_speed,
        route_distance_nm=route_distance,
        cargo_hs_limit=cargo_hs_limit,
    )
    subject = f"Weekly schedule for {route_obj.name}"
    typer.echo("Dry run" if dry_run else "Dispatching notification")

    explicit_channels = any([email_to, slack, telegram])
    if explicit_channels:
        recipients = email_to or _default_recipients()
        if recipients:
            send_email(table, recipients, subject=subject, dry_run=dry_run)
        if slack:
            send_slack(table, title=subject, dry_run=dry_run)
        if telegram:
            send_telegram(table, title=subject, dry_run=dry_run)
    else:
        container.notifier().send_all(subject, table, dry_run=dry_run)


def _default_recipients() -> list[str]:
    """기본 이메일 대상. Default email recipients."""

    recipients = os.getenv("WV_EMAIL_RECIPIENTS", "")
    return [addr.strip() for addr in recipients.split(",") if addr.strip()]


def main() -> None:
    """엔트리포인트. CLI entrypoint."""

    app()


__all__ = ["app", "main", "build_service_container"]
