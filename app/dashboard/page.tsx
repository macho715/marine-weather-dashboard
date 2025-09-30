'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import MarineOperationsDashboard from '@/components/marine-operations-dashboard'
import { 
  Ship, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  MapPin,
  Activity,
  BarChart3
} from 'lucide-react'

interface KPIData {
  vesselCount: number
  warehouseUtilization: number
  onTimeDelivery: number
  activeAlerts: number
  avgEta: string
  weatherRisk: 'LOW' | 'MEDIUM' | 'HIGH'
}

export default function Dashboard() {
  const [kpiData, setKpiData] = useState<KPIData>({
    vesselCount: 0,
    warehouseUtilization: 0,
    onTimeDelivery: 0,
    activeAlerts: 0,
    avgEta: '0h',
    weatherRisk: 'LOW'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // KPI 데이터 로드
    fetchKpiData()
    const interval = setInterval(fetchKpiData, 30000) // 30초마다 업데이트
    return () => clearInterval(interval)
  }, [])

  const fetchKpiData = async () => {
    try {
      const response = await fetch('/api/kpi')
      if (response.ok) {
        const data = await response.json()
        setKpiData(data)
      }
    } catch (error) {
      console.error('KPI 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWeatherRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return 'bg-red-500'
      case 'MEDIUM': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Logistics Control Tower</h1>
          <p className="text-gray-600 mt-2">실시간 물류 운영 현황 대시보드 with Marine Weather Intelligence</p>
        </div>

        {/* Marine Operations Dashboard */}
        <div className="mb-8">
          <MarineOperationsDashboard />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활성 선박</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiData.vesselCount}</div>
              <p className="text-xs text-muted-foreground">
                현재 추적 중인 선박 수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">창고 가동률</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiData.warehouseUtilization}%</div>
              <p className="text-xs text-muted-foreground">
                현재 창고 사용률
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">정시 배송률</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiData.onTimeDelivery}%</div>
              <p className="text-xs text-muted-foreground">
                지난 24시간 기준
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활성 알림</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{kpiData.activeAlerts}</div>
              <p className="text-xs text-muted-foreground">
                주의가 필요한 항목
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                평균 ETA
              </CardTitle>
              <CardDescription>현재 운항 중인 선박들의 평균 도착 예정 시간</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{kpiData.avgEta}</div>
              <p className="text-sm text-gray-600 mt-2">
                다음 업데이트: 30초 후
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                기상 위험도
              </CardTitle>
              <CardDescription>현재 해상 기상 조건 기반 위험 평가</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge 
                  className={`${getWeatherRiskColor(kpiData.weatherRisk)} text-white`}
                >
                  {kpiData.weatherRisk}
                </Badge>
                <span className="text-sm text-gray-600">
                  {kpiData.weatherRisk === 'HIGH' ? '항해 주의 필요' : 
                   kpiData.weatherRisk === 'MEDIUM' ? '일부 지연 가능' : '정상 운항'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button 
            onClick={() => window.location.href = '/vessel-tracking'}
            className="flex items-center gap-2"
          >
            <Ship className="h-4 w-4" />
            선박 추적
          </Button>
          <Button 
            onClick={() => window.location.href = '/warehouse'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            창고 관리
          </Button>
          <Button 
            onClick={() => window.location.href = '/analytics'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            데이터 분석
          </Button>
          <Button 
            onClick={fetchKpiData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            새로고침
          </Button>
        </div>
      </div>
    </div>
  )
}
