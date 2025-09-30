'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarineDecision, MarineWeatherData } from '@/components/marine-operations-dashboard';

interface DataExportProps {
  marineDecision: MarineDecision | null;
  weatherData: MarineWeatherData[];
  lastUpdate: Date | null;
}

export default function DataExport({ marineDecision, weatherData, lastUpdate }: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');

  // JSON 데이터 생성
  const generateJSONData = () => {
    return {
      exportInfo: {
        timestamp: new Date().toISOString(),
        lastUpdate: lastUpdate?.toISOString(),
        format: 'json',
        version: '1.0'
      },
      marineDecision,
      weatherData,
      summary: {
        totalWeatherPoints: weatherData.length,
        decision: marineDecision?.decision || 'Unknown',
        waveHeight: marineDecision?.Hs_fused_m || 0,
        windSpeed: marineDecision?.W_fused_kt || 0,
        eta: marineDecision?.ETA_hours || 0
      }
    };
  };

  // CSV 데이터 생성
  const generateCSVData = () => {
    const headers = [
      'Timestamp',
      'Latitude',
      'Longitude',
      'Wave Height (m)',
      'Wind Speed (m/s)',
      'Wind Direction (deg)',
      'Visibility (km)',
      'Swell Height (m)',
      'Swell Period (s)',
      'Swell Direction (deg)',
      'Tide Height (m)',
      'Source',
      'Bias Corrected'
    ];

    const rows = weatherData.map(data => {
      const measurements = data.measurements.reduce((acc, m) => {
        acc[m.variable] = m.value;
        return acc;
      }, {} as Record<string, number>);

      return [
        data.timestamp,
        data.latitude,
        data.longitude,
        measurements.Hs || '',
        measurements.U10 || '',
        measurements.U10_DIR || '',
        measurements.Vis || '',
        measurements.SwellHs || '',
        measurements.SwellTp || '',
        measurements.SwellDir || '',
        measurements.Tide || '',
        data.source,
        data.bias_corrected
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // 파일 다운로드
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 데이터 내보내기 실행
  const handleExport = async () => {
    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      switch (exportFormat) {
        case 'json':
          const jsonData = generateJSONData();
          downloadFile(
            JSON.stringify(jsonData, null, 2),
            `marine-data-${timestamp}.json`,
            'application/json'
          );
          break;
          
        case 'csv':
          const csvData = generateCSVData();
          downloadFile(
            csvData,
            `marine-weather-${timestamp}.csv`,
            'text/csv'
          );
          break;
          
        case 'pdf':
          // PDF 생성은 별도 라이브러리 필요 (jsPDF 등)
          alert('PDF 내보내기는 준비 중입니다.');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  // 데이터 요약 정보
  const getDataSummary = () => {
    if (!marineDecision || weatherData.length === 0) {
      return { hasData: false, summary: null };
    }

    const summary = {
      decision: marineDecision.decision,
      waveHeight: marineDecision.Hs_fused_m,
      windSpeed: marineDecision.W_fused_kt,
      eta: marineDecision.ETA_hours,
      totalWeatherPoints: weatherData.length,
      timeRange: {
        start: weatherData[0]?.timestamp,
        end: weatherData[weatherData.length - 1]?.timestamp
      }
    };

    return { hasData: true, summary };
  };

  const { hasData, summary } = getDataSummary();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">데이터 내보내기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-slate-400">내보낼 데이터가 없습니다.</p>
        ) : (
          <>
            {/* 데이터 요약 */}
            <div className="bg-slate-700/50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2">데이터 요약</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>의사결정: {summary?.decision}</div>
                <div>파고: {summary?.waveHeight}m</div>
                <div>풍속: {summary?.windSpeed}kt</div>
                <div>ETA: {summary?.eta}h</div>
                <div>기상 포인트: {summary?.totalWeatherPoints}개</div>
                <div>시간 범위: {summary?.timeRange.start} ~ {summary?.timeRange.end}</div>
              </div>
            </div>

            {/* 내보내기 옵션 */}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-300 mb-2 block">내보내기 형식</label>
                <div className="flex gap-2">
                  {(['json', 'csv', 'pdf'] as const).map(format => (
                    <Button
                      key={format}
                      onClick={() => setExportFormat(format)}
                      size="sm"
                      className={exportFormat === format ? 'bg-cyan-600' : 'bg-slate-700'}
                    >
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isExporting ? '내보내는 중...' : '데이터 내보내기'}
              </Button>
            </div>

            {/* 형식별 설명 */}
            <div className="text-xs text-slate-400">
              {exportFormat === 'json' && (
                <p>JSON 형식으로 모든 데이터를 포함하여 내보냅니다. 프로그래밍적으로 처리하기에 적합합니다.</p>
              )}
              {exportFormat === 'csv' && (
                <p>CSV 형식으로 기상 데이터를 표 형태로 내보냅니다. Excel이나 스프레드시트에서 열기기에 적합합니다.</p>
              )}
              {exportFormat === 'pdf' && (
                <p>PDF 형식으로 보고서 형태로 내보냅니다. 인쇄나 공유하기에 적합합니다.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
