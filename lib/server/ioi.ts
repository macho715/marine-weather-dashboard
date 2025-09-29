/**
 * IOI (Indication of Interest) Service
 * Handles marine data, vessel information, and weather integration
 */

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

/**
 * Fetch marine-related data
 */
export async function fetchMarineData(query: MarineDataQuery): Promise<IOIData | null> {
  try {
    // TODO: Implement actual API integration (AIS, weather APIs, etc.)
    // For now, return mock data structure
    
    if (!query.vesselId && !query.imo && !query.mmsi) {
      return null;
    }

    // Mock response - replace with actual API calls
    const mockData: IOIData = {
      vesselName: query.vesselId || 'Unknown Vessel',
      imo: query.imo,
      mmsi: query.mmsi,
      position: {
        lat: 24.4539,
        lon: 54.3773 // Abu Dhabi coordinates
      },
      weather: {
        temp: 32,
        windSpeed: 15,
        waveHeight: 1.5
      },
      eta: new Date(Date.now() + 86400000).toISOString() // +24 hours
    };

    return mockData;
  } catch (error) {
    console.error('Error fetching marine data:', error);
    return null;
  }
}

/**
 * Get briefing data for dashboard
 */
export async function getBriefingData() {
  try {
    // TODO: Implement actual briefing logic
    return {
      status: 'operational',
      activeVessels: 0,
      alerts: [],
      lastUpdate: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting briefing data:', error);
    return null;
  }
}

/**
 * Compute IOI (Index of Interest) from marine data
 */
export function computeIoiFromMarine(data: {
  hs: number | null;
  windKt: number | null;
  swellPeriod: number | null;
}): number {
  const { hs, windKt, swellPeriod } = data;
  
  // Base IOI score (higher is better)
  let ioi = 100;
  
  // Reduce IOI based on wave height (Hs)
  if (hs !== null && hs > 0) {
    if (hs > 4.0) ioi -= 40; // Very rough seas
    else if (hs > 3.0) ioi -= 25; // Rough seas
    else if (hs > 2.0) ioi -= 15; // Moderate seas
    else if (hs > 1.0) ioi -= 5; // Slight seas
  }
  
  // Reduce IOI based on wind speed
  if (windKt !== null && windKt > 0) {
    if (windKt > 30) ioi -= 35; // Very strong winds
    else if (windKt > 25) ioi -= 25; // Strong winds
    else if (windKt > 20) ioi -= 15; // Fresh winds
    else if (windKt > 15) ioi -= 8; // Moderate winds
    else if (windKt > 10) ioi -= 3; // Light winds
  }
  
  // Adjust based on swell period (longer period = better)
  if (swellPeriod !== null && swellPeriod > 0) {
    if (swellPeriod < 6) ioi -= 10; // Short period = choppy
    else if (swellPeriod > 12) ioi += 5; // Long period = smooth
  }
  
  // Ensure IOI stays within reasonable bounds
  return Math.max(0, Math.min(100, Math.round(ioi)));
}

/**
 * Derive IOI for a voyage based on its characteristics
 */
export function deriveVoyageIoi(voyage: {
  swellFt?: number;
  windKt?: number;
  swellPeriod?: number;
  [key: string]: any;
}): number {
  // Convert swell from feet to meters if needed
  const hs = voyage.swellFt ? voyage.swellFt * 0.3048 : null;
  
  return computeIoiFromMarine({
    hs,
    windKt: voyage.windKt || null,
    swellPeriod: voyage.swellPeriod || null
  });
}

/**
 * IOI Service singleton
 */
export const ioiService = {
  fetchMarineData,
  getBriefingData,
  computeIoiFromMarine,
  deriveVoyageIoi
};