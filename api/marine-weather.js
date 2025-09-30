// Vercel Functions - 해양 기상 데이터 API
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
    
    // Mock 기상 데이터 생성 (24시간)
    const mockWeatherData = Array.from({ length: 24 }).map((_, i) => ({
      timestamp: new Date(Date.now() + i * 3600 * 1000).toISOString(),
      position: { lat: parseFloat(lat || 25.0), lon: parseFloat(lon || 55.0) },
      measurements: [
        { variable: 'Hs', value: (0.5 + Math.random() * 2).toFixed(2), unit: 'm' },
        { variable: 'U10', value: (5 + Math.random() * 10).toFixed(1), unit: 'm/s' },
        { variable: 'Vis', value: (10 + Math.random() * 5).toFixed(1), unit: 'km' },
        { variable: 'SwellHs', value: (0.2 + Math.random() * 1).toFixed(2), unit: 'm' },
        { variable: 'Tide', value: (0.1 + Math.random() * 0.5).toFixed(2), unit: 'm' },
      ],
      metadata: { source: 'mock-weather', units: {} },
    }));
    
    res.status(200).json({
      success: true,
      data: mockWeatherData,
      coordinates: { lat: parseFloat(lat || 25.0), lon: parseFloat(lon || 55.0) },
      timestamp: new Date().toISOString(),
      source: 'Vercel Functions'
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
