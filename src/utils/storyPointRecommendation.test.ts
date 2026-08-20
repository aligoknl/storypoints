import { describe, expect, it } from "vitest";
import { getNumericDeckValues, recommendStoryPointFromAverage } from "./storyPointRecommendation";

describe("getNumericDeckValues", () => {
  it("keeps only numeric values, sorted and unique", () => {
    expect(getNumericDeckValues(["5", "?", "3", "5", "☕", "8"])).toEqual([3, 5, 8]);
  });

  it("supports comma decimal values", () => {
    expect(getNumericDeckValues(["1,5", "2", "2,5"])).toEqual([1.5, 2, 2.5]);
  });
});

describe("recommendStoryPointFromAverage", () => {
  it("returns null when average is null", () => {
    expect(recommendStoryPointFromAverage(null, ["2", "3", "5"])).toBeNull();
  });

  it("recommends closest deck value for common fibonacci deck", () => {
    expect(recommendStoryPointFromAverage(9, ["2", "3", "5", "8", "13"])).toBe(8);
  });

  it("recommends higher value when average is closer to upper card", () => {
    expect(recommendStoryPointFromAverage(10.6, ["2", "3", "5", "8", "13"])).toBe(13);
  });

  it("breaks exact distance ties upward", () => {
    expect(recommendStoryPointFromAverage(4, ["2", "3", "5", "8", "13"])).toBe(5);
  });

  it("falls back to ceil when deck has no numeric values", () => {
    expect(recommendStoryPointFromAverage(4.2, ["?", "☕"])).toBe(5);
  });
});
