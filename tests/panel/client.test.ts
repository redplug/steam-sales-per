import { describe, expect, it } from "vitest";
import { createRequestTracker } from "../../scripts/panel/client.js";

describe("createRequestTracker", () => {
  it("implements last-input-wins semantics", () => {
    const tracker = createRequestTracker();
    const first = tracker.begin();
    const second = tracker.begin();

    expect(tracker.isCurrent(first)).toBe(false);
    expect(tracker.isCurrent(second)).toBe(true);
  });
});
