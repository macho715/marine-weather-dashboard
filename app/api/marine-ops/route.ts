import { NextRequest, NextResponse } from 'next/server';

// ADNOC × Al Bahar 융합 의사결정 알고리즘 (TypeScript 구현)
interface MarineInputs {
  C_ft: number;        // ADNOC Combined(seas) in feet
  W_adnoc: number;     // ADNOC wind speed in knots
  Hs_on_ft: number;    // Al Bahar onshore significant wave height in feet
  Hs_off_ft: number;   // Al Bahar offshore significant wave height in feet
  W_albahar: number;   // Al Bahar wind speed in knots
  alert: string | null; // Al Bahar alert message
  w_off: number;       // Offshore weight (0-1)
  D_NM: number;        // Distance in nautical miles
  V_plan: number;      // Planned speed in knots
}

interface MarineOutput {
  Hs_fused_m: number;   // Fused significant wave height in meters
  W_fused_kt: number;   // Fused wind speed in knots
  decision: string;      // Go/Conditional Go/No-Go decision
  ETA_hours: number;    // Estimated time of arrival in hours
  buffer_min: number;   // Buffer time in minutes
}

function decide_and_eta(inputs: MarineInputs): MarineOutput {
  const FT_TO_M = 0.3048;
  const ALERT_GAMMA: Record<string, number> = {
    '': 0.0,
    'rough at times westward': 0.15,
    'High seas': 0.30,
    'Fog': 0.0,
  };

  // A) 단위 통일 (Unit normalization)
  const Hs_on = inputs.Hs_on_ft * FT_TO_M;
  const Hs_off = inputs.Hs_off_ft * FT_TO_M;
  const Hs_from_ADNOC = 0.85 * (inputs.C_ft * FT_TO_M); // alpha = 0.85

  // B) NCM(연안/외해) 혼합 (NCM coastal/offshore blend)
  const Hs_NCM = (1 - inputs.w_off) * Hs_on + inputs.w_off * Hs_off;

  // C) 최종 파고 융합 (Final wave height fusion)
  const gamma = ALERT_GAMMA[inputs.alert || ''] || 0.0;
  const Hs_fused = Math.max(Hs_NCM, 0.80 * Hs_from_ADNOC) * (1 + gamma); // beta = 0.80

  // D) 풍속 융합 (Wind speed fusion)
  const W_fused = Math.max(inputs.W_adnoc, inputs.W_albahar);

  // E) Go/No-Go 게이트 (Go/No-Go gates)
  let decision: string;
  if ((inputs.alert || '').toLowerCase().startsWith('high seas') || (inputs.alert || '').toLowerCase() === 'fog') {
    decision = 'No-Go';
  } else if (Hs_fused <= 1.00 && W_fused <= 20 && gamma === 0.0) {
    decision = 'Go';
  } else if (Hs_fused <= 1.20 || W_fused <= 22 || gamma > 0.0) {
    decision = 'Conditional Go';
  } else {
    decision = 'No-Go';
  }

  // 선택적 연안 윈도잉 (Optional coastal windowing)
  if (decision === 'No-Go' && inputs.w_off <= 0.40 && Hs_on <= 1.00 && gamma <= 0.15) {
    decision = 'Conditional Go (coastal window)';
  }

  // F) ETA 계산 (ETA calculation)
  const f_wind = 0.06 * Math.max(W_fused - 10.0, 0.0);
  const f_wave = 0.60 * Hs_fused;
  const V_eff = Math.max(inputs.V_plan - f_wind - f_wave, 0.1);
  const ETA_h = inputs.D_NM / V_eff;

  // 버퍼 시간 (Buffer time)
  const buffer_min = inputs.w_off <= 0.40 ? 45 : 60;

  return {
    Hs_fused_m: Math.round(Hs_fused * 100) / 100,
    W_fused_kt: Math.round(W_fused * 10) / 10,
    decision,
    ETA_hours: Math.round(ETA_h * 10) / 10,
    buffer_min,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 검증
    const inputs: MarineInputs = {
      C_ft: body.combined_ft || 3.5,
      W_adnoc: body.wind_adnoc || 15.0,
      Hs_on_ft: body.hs_onshore_ft || 2.0,
      Hs_off_ft: body.hs_offshore_ft || 3.0,
      W_albahar: body.wind_albahar || 18.0,
      alert: body.alert || null,
      w_off: body.offshore_weight || 0.35,
      D_NM: body.distance_nm || 120.0,
      V_plan: body.planned_speed || 12.0,
    };
    
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
  const sampleInputs: MarineInputs = {
    C_ft: 3.5,
    W_adnoc: 15.0,
    Hs_on_ft: 2.0,
    Hs_off_ft: 3.0,
    W_albahar: 18.0,
    alert: "rough at times westward",
    w_off: 0.35,
    D_NM: 120.0,
    V_plan: 12.0,
  };
  
  const result = decide_and_eta(sampleInputs);
  
  return NextResponse.json({
    success: true,
    data: result,
    coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
    timestamp: new Date().toISOString(),
  });
}
