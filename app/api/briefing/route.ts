import { NextResponse } from "next/server";

import { computeIoiFromMarine, deriveVoyageIoi } from "../../../lib/server/ioi";
import { WeatherWindowRecord } from "../../../lib/server/vessel-data";

type IncomingVoyage = {
  id: string;
  cargo: string;
  etd: string;
  eta: string;
  status: string;
  origin?: string;
  destination?: string;
};

type MarineSnapshot = {
  hs?: number | null;
  windKt?: number | null;
  swellPeriod?: number | null;
  fetchedAt?: string;
  ioi?: number | null;
};

type BriefingPayload = {
  current_time?: string;
  vessel_name?: string;
  vessel_status?: string;
  current_voyage?: string | null;
  schedule?: IncomingVoyage[];
  weather_windows?: WeatherWindowRecord[];
  model?: string;
  marine_snapshot?: MarineSnapshot;
};

function safeDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? null : d;
}

function safeNumber(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : null;
}

function formatLocal(value: Date, tz: string) {
  return value.toLocaleString("ko-KR", {
    timeZone: tz,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function summariseWeather(windows: WeatherWindowRecord[], tz: string) {
  if (!windows.length) {
    return "- 기상 경고 없음";
  }
  return windows
    .map((window) => {
      const start = safeDate(window.start);
      const end = safeDate(window.end);
      const span =
        start && end
          ? `${formatLocal(start, tz)} – ${formatLocal(end, tz)}`
          : "시간 미정";
      return `- ${span}: Hs ${window.wave_m.toFixed(2)} m · Wind ${window.wind_kt.toFixed(2)} kt · ${window.summary}`;
    })
    .join("\n");
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as BriefingPayload;
  const tz = "Asia/Dubai";
  const now = safeDate(payload.current_time ?? null) ?? new Date();
  const schedule = (payload.schedule ?? []).map((item) => ({
    ...item,
    etd: safeDate(item.etd) ?? new Date(item.etd ?? now.toISOString()),
    eta: safeDate(item.eta) ?? new Date(item.eta ?? now.toISOString()),
  }));

  const sorted = schedule.sort((a, b) => a.etd.valueOf() - b.etd.valueOf());
  const active =
    sorted.find((voyage) => now >= voyage.etd && now <= voyage.eta) ??
    sorted.find((voyage) => voyage.id === payload.current_voyage) ??
    sorted[0];

  const headline = `${payload.vessel_name ?? "선박"} · 상태: ${payload.vessel_status ?? "N/A"}`;
  const voyageLine = active
    ? `진행 항차: ${active.id} (${active.cargo}) · ETD ${formatLocal(active.etd, tz)} · ETA ${formatLocal(active.eta, tz)}`
    : "진행 중인 항차가 없습니다.";

  const riskLines = sorted
    .slice(0, 3)
    .map((voyage) => {
      const synthetic = {
        ...voyage,
        swellFt: 3.28084,
        windKt: 15,
      };
      const ioi = deriveVoyageIoi(synthetic as any);
      const clampedIoi = Number.isFinite(ioi)
        ? Math.max(0, Math.min(100, ioi))
        : 0;
      const bucket =
        clampedIoi >= 75 ? "GO" : clampedIoi >= 55 ? "WATCH" : "NO-GO";
      return `• ${voyage.id}: ${bucket} (${clampedIoi.toFixed(0)} IOI) – ${formatLocal(voyage.etd, tz)} / ${formatLocal(voyage.eta, tz)}`;
    })
    .join("\n");

  const weather = summariseWeather(payload.weather_windows ?? [], tz);

  const marineHs = safeNumber(payload.marine_snapshot?.hs);
  const marineWind = safeNumber(payload.marine_snapshot?.windKt);
  const marineSwell = safeNumber(payload.marine_snapshot?.swellPeriod);
  const marineIoi =
    payload.marine_snapshot?.ioi ??
    computeIoiFromMarine({
      hs: marineHs,
      windKt: marineWind,
      swellPeriod: marineSwell,
    });
  const marineSummary = `\n[Marine Snapshot] Hs ${marineHs != null ? marineHs.toFixed(2) : "--"} m · Wind ${
    marineWind != null ? marineWind.toFixed(2) : "--"
  } kt · IOI ${marineIoi != null ? Math.round(Math.max(0, Math.min(100, marineIoi))) : "n/a"}`;

  const briefing = [
    headline,
    `현재 시각: ${formatLocal(now, tz)}`,
    voyageLine,
    "\n[Top 3 IOI]",
    riskLines,
    "\n[Weather Windows]",
    weather,
    "\n권장 조치:",
    "- 승무원과 하역팀에 최신 일정 공유",
    "- 야간 기상 창 감시 유지",
    "- Risk Scan 버튼으로 6시간마다 재평가",
    marineSummary,
  ].join("\n");

  return NextResponse.json({ briefing });
}
