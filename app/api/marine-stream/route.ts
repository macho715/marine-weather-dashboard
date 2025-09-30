import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '25.0');
  const lon = parseFloat(searchParams.get('lon') || '55.0');

  // Server-Sent Events 설정
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  const stream = new ReadableStream({
    start(controller) {
      // 초기 데이터 전송
      const initialData = {
        type: 'init',
        timestamp: new Date().toISOString(),
        coordinates: { lat, lon },
        message: '해양 운항 실시간 스트림 시작'
      };
      
      controller.enqueue(`data: ${JSON.stringify(initialData)}\n\n`);

      // 30초마다 데이터 업데이트
      const interval = setInterval(() => {
        const updateData = {
          type: 'update',
          timestamp: new Date().toISOString(),
          coordinates: { lat, lon },
          marine_decision: {
            Hs_fused_m: (0.5 + Math.random() * 2.0).toFixed(2),
            W_fused_kt: (10 + Math.random() * 15).toFixed(1),
            decision: ['Go', 'Conditional Go', 'No-Go'][Math.floor(Math.random() * 3)],
            ETA_hours: (8 + Math.random() * 12).toFixed(1),
            buffer_min: Math.random() > 0.5 ? 45 : 60
          },
          weather_summary: {
            wave_height: (0.5 + Math.random() * 2.5).toFixed(2),
            wind_speed: (5 + Math.random() * 20).toFixed(1),
            visibility: (5 + Math.random() * 15).toFixed(1),
            temperature: (20 + Math.random() * 15).toFixed(1)
          }
        };

        controller.enqueue(`data: ${JSON.stringify(updateData)}\n\n`);
      }, 30000);

      // 연결 종료 시 정리
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, { headers });
}
