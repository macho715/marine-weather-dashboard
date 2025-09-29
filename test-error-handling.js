#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function runErrorHandlingTests() {
  console.log('🛡️  에러 핸들링 테스트 시작\n');
  
  const tests = [
    {
      name: '잘못된 엔드포인트',
      url: '/api/nonexistent/',
      expectedStatus: 404
    },
    {
      name: 'Marine API - 잘못된 포트',
      url: '/api/marine/?port=InvalidPort',
      expectedStatus: 400
    },
    {
      name: 'Vessel Actions - 잘못된 액션',
      url: '/api/vessel/actions/',
      method: 'POST',
      body: { action: 'invalid-action' },
      expectedStatus: 400
    },
    {
      name: 'Briefing API - 잘못된 JSON',
      url: '/api/briefing/',
      method: 'POST',
      body: 'invalid-json',
      expectedStatus: 400
    },
    {
      name: 'Assistant API - 빈 프롬프트',
      url: '/api/assistant/',
      method: 'POST',
      body: 'prompt=&model=gpt-4.1-mini',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      expectedStatus: 200 // 빈 프롬프트는 기본 응답을 반환
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`🔄 ${test.name} 테스트 중...`);
    
    try {
      const result = await makeRequest(`${BASE_URL}${test.url}`, {
        method: test.method,
        body: test.body,
        headers: test.headers
      });
      
      const isExpected = result.status === test.expectedStatus;
      results.push({
        name: test.name,
        status: isExpected ? '✅ PASS' : '❌ FAIL',
        actualStatus: result.status,
        expectedStatus: test.expectedStatus,
        response: result.data
      });
      
      console.log(`   ${isExpected ? '✅' : '❌'} Status: ${result.status} (예상: ${test.expectedStatus})`);
      
      if (result.data && typeof result.data === 'object') {
        if (result.data.error) {
          console.log(`   에러 메시지: ${result.data.error}`);
        } else if (result.data.message) {
          console.log(`   응답 메시지: ${result.data.message}`);
        }
      }
      
    } catch (error) {
      results.push({
        name: test.name,
        status: '❌ FAIL',
        actualStatus: 'ERROR',
        expectedStatus: test.expectedStatus,
        response: error.message
      });
      
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  // 결과 요약
  console.log('📊 에러 핸들링 테스트 결과 요약');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status.includes('✅')).length;
  const failed = results.filter(r => r.status.includes('❌')).length;
  
  results.forEach(result => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   실제: ${result.actualStatus}, 예상: ${result.expectedStatus}`);
  });
  
  console.log('='.repeat(60));
  console.log(`총 테스트: ${results.length}개`);
  console.log(`✅ 성공: ${passed}개`);
  console.log(`❌ 실패: ${failed}개`);
  console.log(`성공률: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 모든 에러 핸들링 테스트가 성공했습니다!');
  } else {
    console.log('\n⚠️  일부 에러 핸들링이 예상과 다릅니다.');
  }
}

runErrorHandlingTests().catch(console.error);
