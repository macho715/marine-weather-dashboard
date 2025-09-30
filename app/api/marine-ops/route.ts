import { NextRequest, NextResponse } from 'next/server';
import { MarineInputs, decide_and_eta } from '../../../src/marine_ops/core/marine_decision';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 검증
    const inputs = MarineInputs.parse(body);
    
    // 해양 운항 의사결정 실행
    const result = decide_and_eta(inputs);
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Marine ops API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  
  if (!lat || !lon) {
    return NextResponse.json(
      { success: false, error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }
  
  // 샘플 데이터로 의사결정 실행
  const sampleInputs = new MarineInputs({
    combined_ft: 3.5,
    wind_adnoc: 15.0,
    hs_onshore_ft: 2.0,
    hs_offshore_ft: 3.0,
    wind_albahar: 18.0,
    alert: "rough at times westward",
    offshore_weight: 0.35,
    distance_nm: 120.0,
    planned_speed: 12.0,
  });
  
  const result = decide_and_eta(sampleInputs);
  
  return NextResponse.json({
    success: true,
    data: result,
    coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
    timestamp: new Date().toISOString(),
  });
}
