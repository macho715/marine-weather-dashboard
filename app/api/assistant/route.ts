import { NextResponse } from "next/server";

import { deriveVoyageIoi } from "../../../lib/server/ioi";
import { VESSEL_DATASET } from "../../../lib/server/vessel-data";

const LOWER_PROMPT_MATCH = [
  { key: "weather", handler: buildWeatherInsight },
  { key: "risk", handler: buildRiskInsight },
  { key: "schedule", handler: buildRiskInsight },
];

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const prompt = String(form.get("prompt") ?? "").trim();
  const model = String(form.get("model") ?? "gpt-4.1-mini");
  const attachments = form
    .getAll("files")
    .map((item) => (item instanceof File ? item : null))
    .filter((file): file is File => Boolean(file));

  if (!prompt) {
    return NextResponse.json({ answer: "질문을 입력해주세요." });
  }

  const lower = prompt.toLowerCase();
  const handler = LOWER_PROMPT_MATCH.find((entry) =>
    lower.includes(entry.key),
  )?.handler;
  const dataset = VESSEL_DATASET ?? {
    schedule: [],
    weatherWindows: [],
    timezone: "Asia/Dubai",
  };
  const context = {
    attachments,
    prompt,
    model,
    dataset,
  };

  if (!handler) {
    return NextResponse.json({ answer: buildDefaultInsight(context) });
  }

  const body = handler(context);
  const attachmentLine = attachments.length
    ? `\n첨부 ${attachments.length}건: ${attachments.map((file) => file.name || "무제").join(", ")}`
    : "\n첨부 없음: 파일을 추가하면 더 정확한 답변을 제공할 수 있어요.";

  return NextResponse.json({
    answer: `${body}\n모델: ${model}${attachmentLine}`,
  });
}

interface AssistantContext {
  prompt: string;
  model: string;
  attachments: File[];
  dataset: typeof VESSEL_DATASET;
}

function buildWeatherInsight(context: AssistantContext) {
  const tz = context.dataset.timezone;
  const windows = Array.isArray(context.dataset.weatherWindows)
    ? context.dataset.weatherWindows
    : [];
  if (!windows.length) {
    return "📡 등록된 기상 창 정보가 없습니다. Risk Scan으로 최신 데이터를 받아보세요.";
  }
  const lines = windows.map((window) => {
    const start = new Date(window.start);
    const end = new Date(window.end);
    const span =
      `${start.toLocaleString("ko-KR", { timeZone: tz, hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}` +
      ` – ${end.toLocaleString("ko-KR", { timeZone: tz, hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}`;
    return `• ${span} · Hs ${window.wave_m.toFixed(2)} m · Wind ${window.wind_kt.toFixed(2)} kt · ${window.summary}`;
  });

  return [
    "📡 최신 기상 창 요약",
    ...lines,
    "- 2.10 m 이상 파고 구간에서는 야간 창구 대기 6시간 확보",
    "- Warn 창에는 보조 예비 항로를 준비하세요.",
  ].join("\n");
}

function buildRiskInsight(context: AssistantContext) {
  const tz = context.dataset.timezone;
  const voyages = (
    Array.isArray(context.dataset.schedule) ? context.dataset.schedule : []
  ).map((voyage) => ({
    voyage,
    ioi: deriveVoyageIoi(voyage),
  }));
  if (!voyages.length) {
    return "🧭 등록된 스케줄이 없습니다. CSV/JSON 업로드 후 다시 시도하세요.";
  }
  const rows = voyages.map(({ voyage, ioi }) => {
    const bucket = ioi >= 75 ? "GO" : ioi >= 55 ? "WATCH" : "NO-GO";
    const etd = new Date(voyage.etd).toLocaleString("ko-KR", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    });
    const eta = new Date(voyage.eta).toLocaleString("ko-KR", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    });
    return `• ${voyage.id}: ${bucket} (${ioi.toFixed(0)} IOI) · ${etd} → ${eta}`;
  });
  return [
    "🧭 IOI 및 스케줄 상태",
    ...rows,
    "- WATCH 이상 항차는 출항 6시간 전 현장 기상 재확인",
    "- NO-GO 항차는 Delay 24h 액션을 통해 자동 보류 가능합니다.",
  ].join("\n");
}

function buildDefaultInsight(context: AssistantContext) {
  return [
    `요청하신 내용("${context.prompt}")과 일치하는 키워드를 찾지 못했습니다.`,
    "사용 가능한 키워드: weather, risk, schedule.",
    context.attachments.length
      ? "첨부 파일은 인식했으나 카테고리가 없어 분석하지 않았습니다."
      : "첨부가 없다면 스케줄 CSV나 기상 JSON을 업로드해 주세요.",
    "예: 'weather briefing' 또는 'risk summary V001'",
  ].join("\n");
}
