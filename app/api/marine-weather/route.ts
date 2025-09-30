import { NextRequest, NextResponse } from 'next/server';
import { MarineOpsSettings } from '../../../src/marine_ops/core/settings';
import { fetch_forecast_with_fallback } from '../../../src/marine_ops/connectors';
import { z } from 'zod';

const MarineWeatherQuery = z.object({
  lat: z.string().transform(Number),
  lon: z.string().transform(Number),
  hours: z.string().transform(Number).optional().default(72),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = MarineWeatherQuery.parse(Object.fromEntries(searchParams));
    
    // 환경 설정 로드
    const settings = MarineOpsSettings.from_env();
    
    // 커넥터 생성
    const stormglass = settings.build_stormglass_connector();
    const fallback = settings.build_open_meteo_fallback();
    
    // 예보 조회
    const start = new Date();
    const end = new Date(start.getTime() + query.hours * 60 * 60 * 1000);
    
    const series = await fetch_forecast_with_fallback(
      query.lat,
      query.lon,
      start,
      end,
      stormglass,
      fallback
    );
    
    // 데이터 변환
    const data = series.points.map(point => ({
      timestamp: point.timestamp.toISOString(),
      latitude: point.position.latitude,
      longitude: point.position.longitude,
      measurements: point.measurements.map(m => ({
        variable: m.variable,
        value: m.value,
        unit: m.unit,
        quality_flag: m.quality_flag,
      })),
      source: point.metadata.source,
      bias_corrected: point.metadata.bias_corrected,
    }));
    
    return NextResponse.json({
      success: true,
      data,
      metadata: {
        total_points: data.length,
        hours_requested: query.hours,
        coordinates: { lat: query.lat, lon: query.lon },
        generated_at: new Date().toISOString(),
      },
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
