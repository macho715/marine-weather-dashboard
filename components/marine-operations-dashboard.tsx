'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MarineDecision {
  hs_fused_m: number;
  wind_fused_kt: number;
  decision: string;
  eta_hours: number;
  buffer_minutes: number;
  effective_speed: number;
}

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

export default function MarineOperationsDashboard() {
  const [decision, setDecision] = useState<MarineDecision | null>(null);
  const [weatherData, setWeatherData] = useState<MarineWeatherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarineData = async (lat: number = 25.0, lon: number = 55.0) => {
    setLoading(true);
    setError(null);
    
    try {
      // 해양 운항 의사결정 조회
      const decisionResponse = await fetch(`/api/marine-ops?lat=${lat}&lon=${lon}`);
      const decisionResult = await decisionResponse.json();
      
      if (decisionResult.success) {
        setDecision(decisionResult.data);
      }
      
      // 해양 기상 데이터 조회
      const weatherResponse = await fetch(`/api/marine-weather?lat=${lat}&lon=${lon}&hours=24`);
      const weatherResult = await weatherResponse.json();
      
      if (weatherResult.success) {
        setWeatherData(weatherResult.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch marine data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarineData();
  }, []);

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'Go': return 'bg-green-500';
      case 'Conditional Go': return 'bg-yellow-500';
      case 'No-Go': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDecisionText = (decision: string) => {
    switch (decision) {
      case 'Go': return '운항 가능';
      case 'Conditional Go': return '조건부 운항';
      case 'No-Go': return '운항 중단';
      default: return decision;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">해양 운항 제어 센터</h2>
        <Button onClick={() => fetchMarineData()} disabled={loading}>
          {loading ? '로딩 중...' : '데이터 새로고침'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          오류: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 운항 의사결정 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>운항 의사결정</CardTitle>
          </CardHeader>
          <CardContent>
            {decision ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">결정:</span>
                  <Badge className={getDecisionColor(decision.decision)}>
                    {getDecisionText(decision.decision)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">융합 파고:</span>
                    <span className="ml-2 font-medium">{decision.hs_fused_m}m</span>
                  </div>
                  <div>
                    <span className="text-gray-600">융합 풍속:</span>
                    <span className="ml-2 font-medium">{decision.wind_fused_kt}kt</span>
                  </div>
                  <div>
                    <span className="text-gray-600">예상 소요시간:</span>
                    <span className="ml-2 font-medium">{decision.eta_hours}시간</span>
                  </div>
                  <div>
                    <span className="text-gray-600">유효 속력:</span>
                    <span className="ml-2 font-medium">{decision.effective_speed}kn</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">데이터를 불러오는 중...</div>
            )}
          </CardContent>
        </Card>

        {/* 해양 기상 데이터 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>해양 기상 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {weatherData.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  최근 {weatherData.length}개 데이터 포인트
                </div>
                <div className="space-y-1">
                  {weatherData.slice(0, 3).map((point, index) => (
                    <div key={index} className="text-xs">
                      <div className="font-medium">
                        {new Date(point.timestamp).toLocaleString('ko-KR')}
                      </div>
                      <div className="text-gray-600">
                        {point.measurements.map((m, i) => (
                          <span key={i}>
                            {m.variable}: {m.value}{m.unit}
                            {i < point.measurements.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">기상 데이터를 불러오는 중...</div>
            )}
          </CardContent>
        </Card>

        {/* 시스템 상태 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>시스템 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">API 연결:</span>
                <Badge className={decision ? 'bg-green-500' : 'bg-red-500'}>
                  {decision ? '정상' : '오류'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">데이터 소스:</span>
                <Badge className="bg-blue-500">
                  {weatherData.length > 0 ? weatherData[0]?.source || 'Unknown' : 'N/A'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">마지막 업데이트:</span>
                <span className="text-xs text-gray-600">
                  {new Date().toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
