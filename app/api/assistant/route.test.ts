import { describe, expect, it } from "vitest";

import { POST } from "./route";

function createFormData(entries: Array<[string, string]> = []) {
  const form = new FormData();
  entries.forEach(([key, value]) => form.append(key, value));
  return form;
}

describe("/api/assistant", () => {
  it("returns help message when prompt is empty", async () => {
    const response = await POST(
      new Request("https://example.com/api/assistant", {
        method: "POST",
        body: createFormData(),
      }),
    );
    const payload = await response.json();
    expect(payload.answer).toContain("질문을 입력해주세요");
  });

  it("returns default guidance when no keyword matches", async () => {
    const form = createFormData([
      ["prompt", "hello"],
      ["model", "gpt"],
    ]);
    const response = await POST(
      new Request("https://example.com/api/assistant", {
        method: "POST",
        body: form,
      }),
    );
    const payload = await response.json();
    expect(payload.answer).toContain("키워드");
    expect(payload.answer).toContain("첨부가 없다면");
  });

  it("returns weather insights when keyword is present", async () => {
    const form = createFormData([
      ["prompt", "weather update"],
      ["model", "gpt"],
    ]);
    const response = await POST(
      new Request("https://example.com/api/assistant", {
        method: "POST",
        body: form,
      }),
    );
    const payload = await response.json();
    expect(payload.answer).toContain("📡");
    expect(payload.answer).toContain("모델");
  });
});
