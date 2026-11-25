import { describe, expect, it } from "vitest";

import {
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
  parseMapLocation,
  safeGoogleMapsHref,
} from "@/utils/googleMaps";

describe("google maps helpers", () => {
  it("parses raw latitude/longitude pairs", () => {
    expect(parseMapLocation(" 24.7136, 46.6753 ")).toEqual({
      query: "24.7136,46.6753",
      latitude: 24.7136,
      longitude: 46.6753,
    });
  });

  it("parses coordinates from copied Google Maps links", () => {
    expect(parseMapLocation("https://www.google.com/maps/@24.7136,46.6753,15z")).toMatchObject({
      latitude: 24.7136,
      longitude: 46.6753,
    });
    expect(
      parseMapLocation("https://www.google.com/maps/place/X/@24.71,46.67,17z/data=!3d24.7222!4d46.6888")
    ).toMatchObject({ latitude: 24.7222, longitude: 46.6888 });
  });

  it("preserves copied Google Maps links instead of searching for the URL text", () => {
    const searchLink = "https://www.google.com/maps/search/?api=1&query=%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6";
    expect(parseMapLocation(searchLink)).toMatchObject({
      query: "الرياض",
      url: searchLink,
      latitude: null,
      longitude: null,
    });

    const shortLink = "https://maps.app.goo.gl/abc123";
    expect(parseMapLocation(shortLink)).toMatchObject({ url: shortLink });
  });

  it("keeps plain place searches and rejects invalid coordinates", () => {
    expect(parseMapLocation("الرياض، حي الملقا")).toEqual({
      query: "الرياض، حي الملقا",
      latitude: null,
      longitude: null,
    });
    expect(parseMapLocation("120.5,20")).toEqual({
      query: "120.5,20",
      latitude: null,
      longitude: null,
    });
  });

  it("builds encoded search and embeddable map URLs", () => {
    const query = "الرياض، حي الملقا";
    expect(googleMapsSearchUrl(query)).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    );
    expect(googleMapsEmbedUrl(query)).toContain("output=embed");
    expect(googleMapsEmbedUrl(query)).toContain(encodeURIComponent(query));
  });

  it("only accepts trusted Google Maps URLs as links", () => {
    expect(safeGoogleMapsHref("https://maps.app.goo.gl/abc123")).toBe(
      "https://maps.app.goo.gl/abc123"
    );
    expect(safeGoogleMapsHref("javascript:alert(1)")).toBeNull();
    expect(safeGoogleMapsHref("https://example.com/maps")).toBeNull();
    expect(safeGoogleMapsHref("   ")).toBeNull();
  });
});
