import { NextRequest, NextResponse } from 'next/server'

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    date: number
    text?: string
  }
}

interface AlertData {
  type: 'VESSEL_DELAY' | 'WEATHER_WARNING' | 'WAREHOUSE_ALERT' | 'KPI_THRESHOLD'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  timestamp: string
  data?: any
}

// Telegram Bot Token (환경변수에서 가져옴)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

// Telegram 메시지 전송
async function sendTelegramMessage(chatId: string, message: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN이 설정되지 않았습니다.')
    return false
  }
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })
    
    return response.ok
  } catch (error) {
    console.error('Telegram 메시지 전송 실패:', error)
    return false
  }
}

// 알림 메시지 포맷팅
function formatAlertMessage(alert: AlertData): string {
  const severityEmoji = {
    'LOW': '🟢',
    'MEDIUM': '🟡', 
    'HIGH': '🟠',
    'CRITICAL': '🔴'
  }
  
  const typeEmoji = {
    'VESSEL_DELAY': '🚢',
    'WEATHER_WARNING': '⛈️',
    'WAREHOUSE_ALERT': '📦',
    'KPI_THRESHOLD': '📊'
  }
  
  return `
${severityEmoji[alert.severity]} <b>${alert.type.replace('_', ' ')}</b>
${typeEmoji[alert.type]} ${alert.message}

⏰ ${new Date(alert.timestamp).toLocaleString('ko-KR')}
  `.trim()
}

// Webhook 수신 (Telegram에서 오는 메시지)
export async function POST(request: NextRequest) {
  try {
    const body: TelegramUpdate = await request.json()
    
    // Telegram webhook 검증
    if (body.message) {
      const { message } = body
      console.log('Telegram 메시지 수신:', {
        from: message.from.first_name,
        text: message.text,
        chat_id: message.chat.id
      })
      
      // 간단한 명령어 처리
      if (message.text?.startsWith('/')) {
        const command = message.text.split(' ')[0]
        
        switch (command) {
          case '/status':
            await sendTelegramMessage(
              message.chat.id.toString(),
              '🟢 Logistics Control Tower 정상 운영 중\n\n📊 현재 상태:\n- 시스템: 정상\n- API: 연결됨\n- 데이터베이스: 정상'
            )
            break
            
          case '/kpi':
            // KPI 데이터 조회 및 전송
            const kpiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/kpi`)
            if (kpiResponse.ok) {
              const kpiData = await kpiResponse.json()
              const kpiMessage = `
📊 <b>현재 KPI 현황</b>

🚢 활성 선박: ${kpiData.vesselCount}대
📦 창고 가동률: ${kpiData.warehouseUtilization}%
✅ 정시 배송률: ${kpiData.onTimeDelivery}%
⚠️ 활성 알림: ${kpiData.activeAlerts}개
⏰ 평균 ETA: ${kpiData.avgEta}
🌊 기상 위험도: ${kpiData.weatherRisk}
              `.trim()
              
              await sendTelegramMessage(message.chat.id.toString(), kpiMessage)
            }
            break
            
          default:
            await sendTelegramMessage(
              message.chat.id.toString(),
              '❓ 사용 가능한 명령어:\n/status - 시스템 상태\n/kpi - KPI 현황'
            )
        }
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook 처리 오류:', error)
    return NextResponse.json(
      { error: 'Webhook 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 알림 전송 API
export async function PUT(request: NextRequest) {
  try {
    const alert: AlertData = await request.json()
    
    // 필수 필드 검증
    if (!alert.type || !alert.severity || !alert.message) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }
    
    // Telegram으로 알림 전송
    const chatId = TELEGRAM_CHAT_ID || 'default'
    const message = formatAlertMessage(alert)
    
    const sent = await sendTelegramMessage(chatId, message)
    
    if (sent) {
      return NextResponse.json({
        success: true,
        message: '알림이 성공적으로 전송되었습니다.',
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        { error: '알림 전송에 실패했습니다.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('알림 전송 오류:', error)
    return NextResponse.json(
      { error: '알림 전송에 실패했습니다.' },
      { status: 500 }
    )
  }
}
