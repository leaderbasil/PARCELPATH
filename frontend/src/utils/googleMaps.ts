export interface MapLocationInput {
  query: string;
  /** A trusted Google Maps URL is preserved verbatim instead of being searched. */
  url?: string;
  latitude: number | null;
  longitude: number | null;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

function toCoordinates(lat: string, lng: string): Coordinates | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function isGoogleMapsHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    /(^|\.)google\.[a-z.]+$/.test(host)
  );
}

/** Coordinates may appear as a pair, in an `@lat,lng,zoom` path, or as `!3d...!4d...`. */
function coordinatesFromText(text: string): Coordinates | null {
  const place = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const pair = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  const match = place ?? pair;
  if (!match) return null;
  return toCoordinates(match[1] ?? "", match[2] ?? "");
}

/** Only allow trusted Google Maps links as an href, never raw localStorage text. */
export function safeGoogleMapsHref(value: string | null | undefined): string | null {
  const input = value?.trim();
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!isGoogleMapsHostname(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Accepts a place name, raw "lat,lng", or a copied Google Maps link. */
export function parseMapLocation(value: string): MapLocationInput {
  const input = value.trim();
  if (!input) return { query: "", latitude: null, longitude: null };

  const directCoordinates = toCoordinatesFromPair(input);
  if (directCoordinates) {
    return {
      query: `${directCoordinates.latitude},${directCoordinates.longitude}`,
      latitude: directCoordinates.latitude,
      longitude: directCoordinates.longitude,
    };
  }

  try {
    const url = new URL(input);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      isGoogleMapsHostname(url.hostname)
    ) {
      const storedUrl = url.protocol === "http:" ? url.toString().replace(/^http:/, "https:") : url.toString();
      const text = url.searchParams.get("q") ?? url.searchParams.get("query") ?? url.searchParams.get("place") ?? "";
      const coordinates = coordinatesFromText(text) ?? coordinatesFromText(url.pathname);
      return {
        query: coordinates
          ? `${coordinates.latitude},${coordinates.longitude}`
          : text.trim() || input,
        url: storedUrl,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      };
    }
  } catch {
    // Not a URL: treat the input as a place search below.
  }

  return { query: input, latitude: null, longitude: null };
}

function toCoordinatesFromPair(value: string): Coordinates | null {
  const match = value.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return toCoordinates(match[1] ?? "", match[2] ?? "");
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&hl=ar&output=embed`;
}
