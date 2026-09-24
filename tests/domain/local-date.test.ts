import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  dateInputValue,
  localDateRange,
  utcRangeForDateInput,
} from "@/lib/client/local-date";

const previousTimezone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "Asia/Shanghai";
});

afterAll(() => {
  process.env.TZ = previousTimezone;
});

describe("local calendar date ranges", () => {
  it("maps a Shanghai calendar day to a half-open UTC interval", () => {
    expect(utcRangeForDateInput("2026-09-12")).toEqual({
      start: "2026-09-11T16:00:00.000Z",
      end: "2026-09-12T16:00:00.000Z",
    });
  });

  it("uses the browser calendar day for today's dashboard count", () => {
    expect(localDateRange(new Date("2026-09-11T16:30:00.000Z"))).toEqual({
      start: "2026-09-11T16:00:00.000Z",
      end: "2026-09-12T16:00:00.000Z",
    });
  });

  it("renders an ISO boundary back as the same local date input", () => {
    expect(dateInputValue("2026-09-11T16:00:00.000Z")).toBe("2026-09-12");
  });

  it("keeps a date-only URL value unchanged in a timezone behind UTC", () => {
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(dateInputValue("2026-09-12")).toBe("2026-09-12");
    } finally {
      process.env.TZ = "Asia/Shanghai";
    }
  });
});
