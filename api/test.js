// Vercel Functions - 테스트 API
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
    res.status(200).json({
      success: true,
      message: 'Vercel Functions API가 정상 작동합니다.',
      timestamp: new Date().toISOString(),
      method: 'GET',
      environment: process.env.NODE_ENV || 'development'
    });
  } else if (req.method === 'POST') {
    res.status(200).json({
      success: true,
      message: 'Vercel Functions API가 정상 작동합니다.',
      timestamp: new Date().toISOString(),
      method: 'POST',
      receivedData: req.body,
      environment: process.env.NODE_ENV || 'development'
    });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
