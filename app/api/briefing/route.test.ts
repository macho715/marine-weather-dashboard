import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("/api/briefing", () => {
  it("appends marine snapshot summary", async () => {
    const payload = {
      current_time: "2025-03-17T02:00:00Z",
      vessel_name: "MV",
      vessel_status: "sailing",
      schedule: [
        {
          id: "V001",
          cargo: "Containers",
          etd: "2025-03-17T00:00:00Z",
          eta: "2025-03-18T00:00:00Z",
          status: "ongoing",
        },
      ],
      weather_windows: [],
      marine_snapshot: { hs: 1.25, windKt: 18.4, swellPeriod: 9.2, ioi: 72 },
    };

    const response = await POST(
      new Request("https://example.com/api/briefing", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const body = await response.json();
    expect(body.briefing).toContain("[Marine Snapshot]");
    expect(body.briefing).toContain("72");
  });
});
