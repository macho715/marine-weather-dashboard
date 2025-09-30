import { NextRequest, NextResponse } from 'next/server'

interface WeatherData {
  location: string
  waveHeight: number
  windSpeed: number
  visibility: number
  swellPeriod: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  timestamp: string
}

// NOAA Open-Meteo Marine API 연동
async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  try {
    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wind_speed_10m,visibility,swell_wave_height&forecast_days=1`
    )
    
    if (!response.ok) {
      throw new Error('Weather API 호출 실패')
    }
    
    const data = await response.json()
    const current = data.hourly.time[0]
    const index = data.hourly.time.indexOf(current)
    
    const waveHeight = data.hourly.wave_height[index] || 0
    const windSpeed = data.hourly.wind_speed_10m[index] || 0
    const visibility = data.hourly.visibility[index] || 10
    const swellPeriod = data.hourly.swell_wave_height[index] || 0
    
    // 위험도 계산 (IOI - Index of Interest)
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    
    if (waveHeight > 3.0 || windSpeed > 25 || visibility < 5) {
      riskLevel = 'HIGH'
    } else if (waveHeight > 2.0 || windSpeed > 15 || visibility < 8) {
      riskLevel = 'MEDIUM'
    }
    
    return {
      location: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      waveHeight: Math.round(waveHeight * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
      visibility: Math.round(visibility * 10) / 10,
      swellPeriod: Math.round(swellPeriod * 10) / 10,
      riskLevel,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Weather API Error:', error)
    // Fallback 데이터 반환
    return {
      location: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      waveHeight: 1.5,
      windSpeed: 12,
      visibility: 10,
      swellPeriod: 8,
      riskLevel: 'LOW',
      timestamp: new Date().toISOString()
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '37.5665') // 서울 기본값
    const lon = parseFloat(searchParams.get('lon') || '126.9780')
    
    const weatherData = await fetchWeatherData(lat, lon)
    
    // Cache-Control 헤더 설정 (10분 캐시)
    const response = NextResponse.json(weatherData)
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200')
    
    return response
  } catch (error) {
    console.error('Weather API Error:', error)
    return NextResponse.json(
      { error: '기상 데이터를 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

// 특정 위치들의 기상 데이터 일괄 조회
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { locations } = body // [{lat, lon, name}, ...]
    
    if (!Array.isArray(locations)) {
      return NextResponse.json(
        { error: 'locations 배열이 필요합니다.' },
        { status: 400 }
      )
    }
    
    const weatherPromises = locations.map(async (loc: {lat: number, lon: number, name: string}) => {
      const weather = await fetchWeatherData(loc.lat, loc.lon)
      return {
        ...weather,
        location: loc.name || weather.location
      }
    })
    
    const weatherResults = await Promise.all(weatherPromises)
    
    return NextResponse.json({
      locations: weatherResults,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Bulk Weather API Error:', error)
    return NextResponse.json(
      { error: '일괄 기상 데이터 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
