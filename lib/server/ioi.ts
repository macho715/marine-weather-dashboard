export interface IOIData {
  vesselName?: string;
  imo?: string;
  mmsi?: string;
  position?: {
    lat: number;
    lon: number;
  };
  weather?: {
    temp: number;
    windSpeed: number;
    waveHeight: number;
  };
  eta?: string;
}

export interface MarineDataQuery {
  vesselId?: string;
  imo?: string;
  mmsi?: string;
  location?: string;
}

export async function fetchMarineData(
  query: MarineDataQuery,
): Promise<IOIData | null> {
  try {
    if (!query.vesselId && !query.imo && !query.mmsi) {
      return null;
    }

    return {
      vesselName: query.vesselId || "Unknown Vessel",
      imo: query.imo,
      mmsi: query.mmsi,
      position: {
        lat: 24.4539,
        lon: 54.3773,
      },
      weather: {
        temp: 32,
        windSpeed: 15,
        waveHeight: 1.5,
      },
      eta: new Date(Date.now() + 86_400_000).toISOString(),
    };
  } catch (error) {
    console.error("Error fetching marine data:", error);
    return null;
  }
}

export async function getBriefingData() {
  try {
    return {
      status: "operational",
      activeVessels: 0,
      alerts: [],
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting briefing data:", error);
    return null;
  }
}

function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function clamp(value: number, lower: number, upper: number) {
  return Math.min(upper, Math.max(lower, value));
}

export function computeIoiFromMarine(data: {
  hs: number | null | undefined;
  windKt: number | null | undefined;
  swellPeriod: number | null | undefined;
}): number {
  const hs = safeNumber(data.hs);
  const windKt = safeNumber(data.windKt);
  const swellPeriod = safeNumber(data.swellPeriod);

  let ioi = 100;

  if (hs !== null && hs > 0) {
    if (hs > 4) ioi -= 40;
    else if (hs > 3) ioi -= 25;
    else if (hs > 2) ioi -= 15;
    else if (hs > 1) ioi -= 5;
  }

  if (windKt !== null && windKt > 0) {
    if (windKt > 30) ioi -= 35;
    else if (windKt > 25) ioi -= 25;
    else if (windKt > 20) ioi -= 15;
    else if (windKt > 15) ioi -= 8;
    else if (windKt > 10) ioi -= 3;
  }

  if (swellPeriod !== null && swellPeriod > 0) {
    if (swellPeriod < 6) ioi -= 10;
    else if (swellPeriod > 12) ioi += 5;
  }

  return Math.round(clamp(ioi, 0, 100));
}

export function deriveVoyageIoi(voyage: {
  swellFt?: number | null;
  windKt?: number | null;
  swellPeriod?: number | null;
  [key: string]: unknown;
}): number {
  const swellMeters = safeNumber(voyage.swellFt);
  const windKt = safeNumber(voyage.windKt);
  const swellPeriod = safeNumber(voyage.swellPeriod);

  return computeIoiFromMarine({
    hs: swellMeters !== null ? swellMeters * 0.3048 : null,
    windKt,
    swellPeriod,
  });
}

export const ioiService = {
  fetchMarineData,
  getBriefingData,
  computeIoiFromMarine,
  deriveVoyageIoi,
};
