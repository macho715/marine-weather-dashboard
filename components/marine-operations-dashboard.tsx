'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMarineStream } from '@/hooks/use-marine-stream';

interface MarineDecision {
  Hs_fused_m: number;
  W_fused_kt: number;
  decision: string;
  ETA_hours: number;
  buffer_min: number;
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

interface MarineOperationsDashboardProps {
  latitude?: number;
  longitude?: number;
}

export default function MarineOperationsDashboard({ 
  latitude = 25.0, 
  longitude = 55.0 
}: MarineOperationsDashboardProps) {
  const [marineDecision, setMarineDecision] = useState<MarineDecision | null>(null);
  const [weatherData, setWeatherData] = useState<MarineWeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // 실시간 스트리밍 훅
  const { 
    data: streamData, 
    isConnected, 
    error: streamError, 
    lastUpdate: streamLastUpdate,
    reconnect 
  } = useMarineStream({ latitude, longitude, enabled: true });

  // 해양 운항 의사결정 데이터 가져오기
  const fetchMarineDecision = async () => {
    try {
      const response = await fetch(`/api/marine-ops?lat=${latitude}&lon=${longitude}`);
      if (!response.ok) throw new Error('Failed to fetch marine decision');
      const data = await response.json();
      setMarineDecision(data.data);
    } catch (err) {
      console.error('Error fetching marine decision:', err);
      setError('해양 운항 데이터를 가져올 수 없습니다.');
    }
  };

  // 해양 기상 데이터 가져오기
  const fetchWeatherData = async () => {
    try {
      const response = await fetch(`/api/marine-weather?lat=${latitude}&lon=${longitude}`);
      if (!response.ok) throw new Error('Failed to fetch weather data');
      const data = await response.json();
      setWeatherData(data.data);
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError('기상 데이터를 가져올 수 없습니다.');
    }
  };

  // 데이터 새로고침
  const refreshData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchMarineDecision(), fetchWeatherData()]);
    setLastUpdate(new Date());
    setLoading(false);
  };

  // 초기 데이터 로드
  useEffect(() => {
    refreshData();
  }, [latitude, longitude]);

  // 실시간 스트림 데이터 처리
  useEffect(() => {
    if (streamData?.marine_decision) {
      setMarineDecision({
        Hs_fused_m: parseFloat(streamData.marine_decision.Hs_fused_m),
        W_fused_kt: parseFloat(streamData.marine_decision.W_fused_kt),
        decision: streamData.marine_decision.decision,
        ETA_hours: parseFloat(streamData.marine_decision.ETA_hours),
        buffer_min: streamData.marine_decision.buffer_min
      });
    }
  }, [streamData]);

  // 자동 새로고침 (5분마다)
  useEffect(() => {
    const interval = setInterval(refreshData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  // 의사결정 상태에 따른 색상
  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'Go': return 'bg-green-500';
      case 'Conditional Go': return 'bg-yellow-500';
      case 'Conditional Go (coastal window)': return 'bg-orange-500';
      case 'No-Go': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // 의사결정 상태에 따른 한글 텍스트
  const getDecisionText = (decision: string) => {
    switch (decision) {
      case 'Go': return '출항 가능';
      case 'Conditional Go': return '조건부 출항';
      case 'Conditional Go (coastal window)': return '연안 창 출항';
      case 'No-Go': return '출항 금지';
      default: return '알 수 없음';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-white mb-2">해양 운항 대시보드</h1>
          <p className="text-slate-400">데이터를 로딩 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">해양 운항 대시보드</h1>
              <p className="text-slate-400">ADNOC × Al Bahar 융합 의사결정 시스템</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-slate-400">
                  {isConnected ? '실시간 연결됨' : '연결 끊김'}
                </span>
              </div>
              {streamError && (
                <Button 
                  onClick={reconnect} 
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  재연결
                </Button>
              )}
            </div>
          </div>
          {(lastUpdate || streamLastUpdate) && (
            <p className="text-sm text-slate-500 mt-2">
              마지막 업데이트: {(streamLastUpdate || lastUpdate)?.toLocaleString('ko-KR')}
            </p>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400">{error}</p>
            <Button 
              onClick={refreshData} 
              className="mt-2 bg-red-600 hover:bg-red-700"
            >
              다시 시도
            </Button>
          </div>
        )}

        {/* 메인 의사결정 카드 */}
        {marineDecision && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500/50 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3">
                  <span>운항 의사결정</span>
                  <Badge className={`${getDecisionColor(marineDecision.decision)} text-white animate-pulse`}>
                    {getDecisionText(marineDecision.decision)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">융합 파고</p>
                    <p className="text-2xl font-bold text-white">{marineDecision.Hs_fused_m}m</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">융합 풍속</p>
                    <p className="text-2xl font-bold text-white">{marineDecision.W_fused_kt}kt</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">예상 도착시간</p>
                    <p className="text-2xl font-bold text-white">{marineDecision.ETA_hours}h</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">버퍼 시간</p>
                    <p className="text-2xl font-bold text-white">{marineDecision.buffer_min}분</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">위치 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-slate-400">위도: <span className="text-white">{latitude}°</span></p>
                  <p className="text-slate-400">경도: <span className="text-white">{longitude}°</span></p>
                  <p className="text-slate-400">지역: <span className="text-white">아랍에미리트 연안</span></p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 기상 데이터 테이블 */}
        {weatherData.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">24시간 기상 예보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 py-2">시간</th>
                      <th className="text-left text-slate-400 py-2">파고 (m)</th>
                      <th className="text-left text-slate-400 py-2">풍속 (m/s)</th>
                      <th className="text-left text-slate-400 py-2">가시거리 (km)</th>
                      <th className="text-left text-slate-400 py-2">너울 (m)</th>
                      <th className="text-left text-slate-400 py-2">조석 (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weatherData.slice(0, 12).map((data, index) => {
                      const measurements = data.measurements.reduce((acc, m) => {
                        acc[m.variable] = m.value;
                        return acc;
                      }, {} as Record<string, number>);
                      
                      return (
                        <tr key={index} className="border-b border-slate-700/50">
                          <td className="py-2 text-white">
                            {new Date(data.timestamp).toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </td>
                          <td className="py-2 text-white">{measurements.Hs?.toFixed(2) || '-'}</td>
                          <td className="py-2 text-white">{measurements.U10?.toFixed(1) || '-'}</td>
                          <td className="py-2 text-white">{measurements.Vis?.toFixed(1) || '-'}</td>
                          <td className="py-2 text-white">{measurements.SwellHs?.toFixed(2) || '-'}</td>
                          <td className="py-2 text-white">{measurements.Tide?.toFixed(2) || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 새로고침 버튼 */}
        <div className="mt-8 text-center">
          <Button 
            onClick={refreshData} 
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-3"
          >
            데이터 새로고침
          </Button>
        </div>
      </div>
    </div>
  );
}