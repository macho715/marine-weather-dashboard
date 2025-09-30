import { NextRequest, NextResponse } from 'next/server'

interface KPIData {
  vesselCount: number
  warehouseUtilization: number
  onTimeDelivery: number
  activeAlerts: number
  avgEta: string
  weatherRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp: string
}

// Mock 데이터 (실제로는 데이터베이스나 외부 API에서 가져옴)
const generateMockKPI = (): KPIData => {
  const now = new Date()
  
  return {
    vesselCount: Math.floor(Math.random() * 20) + 5, // 5-24
    warehouseUtilization: Math.floor(Math.random() * 40) + 60, // 60-99%
    onTimeDelivery: Math.floor(Math.random() * 20) + 80, // 80-99%
    activeAlerts: Math.floor(Math.random() * 5), // 0-4
    avgEta: `${Math.floor(Math.random() * 48) + 12}h`, // 12-60h
    weatherRisk: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH',
    timestamp: now.toISOString()
  }
}

export async function GET(request: NextRequest) {
  try {
    // 실제 환경에서는 여기서 외부 API 호출
    // - NOAA Weather API
    // - AIS Vessel Tracking API
    // - Google Sheets 데이터
    // - 데이터베이스 쿼리
    
    const kpiData = generateMockKPI()
    
    // Cache-Control 헤더 설정 (30초 캐시)
    const response = NextResponse.json(kpiData)
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    
    return response
  } catch (error) {
    console.error('KPI API Error:', error)
    return NextResponse.json(
      { error: 'KPI 데이터를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // KPI 데이터 업데이트 로직
    // 실제로는 데이터베이스에 저장하거나 외부 시스템에 전송
    
    console.log('KPI 데이터 업데이트:', body)
    
    return NextResponse.json({ 
      success: true, 
      message: 'KPI 데이터가 업데이트되었습니다.',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('KPI 업데이트 오류:', error)
    return NextResponse.json(
      { error: 'KPI 데이터 업데이트에 실패했습니다.' },
      { status: 500 }
    )
  }
}
