import { NextRequest, NextResponse } from 'next/server';

interface MarineWeatherData {
  timestamp: string;
  latitude: number;
  longitude: number;
  measurements: Array<{
    variable: string;
    value: number;
    unit: string;
    quality_flag: string;
  }>;
  source: string;
  bias_corrected: boolean;
}

// 샘플 해양 기상 데이터 생성
function generateSampleWeatherData(lat: number, lon: number): MarineWeatherData[] {
  const data: MarineWeatherData[] = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
    
    // 시간에 따른 변화하는 값들
    const waveHeight = 0.5 + 0.3 * (i % 8); // 0.5-2.6m
    const windSpeed = 5.0 + 2.0 * (i % 6); // 5-15 m/s
    const windDirection = (180 + i * 15) % 360; // 180-195 degrees
    const visibility = 20.0 - 0.5 * i; // 20-8 km
    const swellHeight = 0.3 + 0.2 * (i % 5); // 0.3-1.1m
    const swellPeriod = 6.0 + 1.0 * (i % 4); // 6-9 seconds
    const swellDirection = (200 + i * 10) % 360; // 200-219 degrees
    const tideHeight = 1.0 + 0.5 * (i % 12); // 1.0-6.0m (12시간 주기)
    
    data.push({
      timestamp: timestamp.toISOString(),
      latitude: lat,
      longitude: lon,
      measurements: [
        {
          variable: 'Hs',
          value: Math.round(waveHeight * 100) / 100,
          unit: 'm',
          quality_flag: 'raw'
        },
        {
          variable: 'U10',
          value: Math.round(windSpeed * 10) / 10,
          unit: 'm/s',
          quality_flag: 'raw'
        },
        {
          variable: 'U10_DIR',
          value: windDirection,
          unit: 'deg',
          quality_flag: 'raw'
        },
        {
          variable: 'Vis',
          value: Math.round(visibility * 10) / 10,
          unit: 'km',
          quality_flag: 'raw'
        },
        {
          variable: 'SwellHs',
          value: Math.round(swellHeight * 100) / 100,
          unit: 'm',
          quality_flag: 'raw'
        },
        {
          variable: 'SwellTp',
          value: Math.round(swellPeriod * 10) / 10,
          unit: 's',
          quality_flag: 'raw'
        },
        {
          variable: 'SwellDir',
          value: swellDirection,
          unit: 'deg',
          quality_flag: 'raw'
        },
        {
          variable: 'Tide',
          value: Math.round(tideHeight * 100) / 100,
          unit: 'm',
          quality_flag: 'raw'
        }
      ],
      source: 'sample',
      bias_corrected: false
    });
  }
  
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '25.0');
    const lon = parseFloat(searchParams.get('lon') || '55.0');
    
    const weatherData = generateSampleWeatherData(lat, lon);
    
    return NextResponse.json({
      success: true,
      data: weatherData,
      coordinates: { lat, lon },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Marine weather API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}