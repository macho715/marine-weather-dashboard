// 테스트 API (Pages Router 버전)
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      success: true,
      message: 'Pages Router API가 정상 작동합니다.',
      timestamp: new Date().toISOString(),
      method: 'GET'
    });
  } else if (req.method === 'POST') {
    res.status(200).json({
      success: true,
      message: 'Pages Router API가 정상 작동합니다.',
      timestamp: new Date().toISOString(),
      method: 'POST',
      receivedData: req.body
    });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
