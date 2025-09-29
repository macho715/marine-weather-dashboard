import { describe, expect, it } from "vitest";

import { POST } from "./route";

function buildRequest(body: unknown) {
  return new Request("https://example.com/api/briefing", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/briefing", () => {
  it("formats schedule and appends marine snapshot", async () => {
    const response = await POST(
      buildRequest({
        current_time: "2025-03-17T04:00:00Z",
        vessel_name: "MV TEST",
        vessel_status: "sailing",
        schedule: [
          {
            id: "V001",
            cargo: "Containers",
            etd: "2025-03-17T02:00:00Z",
            eta: "2025-03-19T08:00:00Z",
            status: "scheduled",
            swellFt: 3,
            windKt: 12,
          },
        ],
        weather_windows: [
          {
            start: "2025-03-17T00:00:00Z",
            end: "2025-03-17T06:00:00Z",
            wave_m: 1.2,
            wind_kt: 10,
            summary: "Favourable",
          },
        ],
        marine_snapshot: {
          hs: 1.1,
          windKt: 14,
          swellPeriod: 10,
          ioi: 78,
        },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.briefing).toContain("MV TEST");
    expect(body.briefing).toContain(
      "[Marine Snapshot] Hs 1.10 m · Wind 14.00 kt · IOI 78",
    );
  });
});
