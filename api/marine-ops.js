// Vercel Functions - 해양 운항 의사결정 API
export default function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { lat, lon } = req.query;
    
    // 샘플 데이터로 의사결정 실행
    const sampleInputs = {
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
    
    res.status(200).json({
      success: true,
      data: result,
      coordinates: { lat: parseFloat(lat || 25.0), lon: parseFloat(lon || 55.0) },
      timestamp: new Date().toISOString(),
      source: 'Vercel Functions'
    });
  } else if (req.method === 'POST') {
    const body = req.body;
    
    // 입력 데이터 검증
    const inputs = {
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
    
    const result = decide_and_eta(inputs);
    
    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      source: 'Vercel Functions'
    });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// ADNOC × Al Bahar 융합 의사결정 알고리즘
function decide_and_eta(inputs) {
  const FT_TO_M = 0.3048;
  const ALERT_GAMMA = {
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
  let decision;
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
