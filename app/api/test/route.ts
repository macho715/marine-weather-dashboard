import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'API 라우트가 정상 작동합니다.',
    timestamp: new Date().toISOString(),
    method: 'GET'
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({
    success: true,
    message: 'API 라우트가 정상 작동합니다.',
    timestamp: new Date().toISOString(),
    method: 'POST',
    receivedData: body
  });
}
