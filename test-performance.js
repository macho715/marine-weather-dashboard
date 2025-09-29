#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
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
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        try {
          const jsonData = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: jsonData, 
            responseTime,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data, 
            responseTime,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        }
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      reject({ error, responseTime });
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function runPerformanceTests() {
  console.log('⚡ 성능 테스트 시작\n');
  
  const tests = [
    { name: 'Health API', url: '/api/health/' },
    { name: 'Vessel API', url: '/api/vessel/' },
    { name: 'Marine API', url: '/api/marine/?port=Jebel%20Ali' },
    { name: 'Briefing API', url: '/api/briefing/', method: 'POST', body: {
      current_time: '2025-09-29T15:30:00Z',
      vessel_name: 'JOPETWIL 71',
      vessel_status: 'Ready @ MW4'
    }},
    { name: 'Report API', url: '/api/report/' },
    { name: 'Vessel Actions API', url: '/api/vessel/actions/', method: 'POST', body: { action: 'quick-go' }},
    { name: 'Assistant API', url: '/api/assistant/', method: 'POST', body: 'prompt=weather&model=gpt-4.1-mini', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }}
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`🔄 ${test.name} 성능 테스트 중...`);
    
    const iterations = 5;
    const responseTimes = [];
    let successCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const result = await makeRequest(`${BASE_URL}${test.url}`, {
          method: test.method,
          body: test.body,
          headers: test.headers
        });
        
        responseTimes.push(result.responseTime);
        if (result.success) successCount++;
        
        // 요청 간 간격
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        responseTimes.push(error.responseTime || 0);
      }
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const successRate = (successCount / iterations) * 100;
    
    results.push({
      name: test.name,
      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime,
      maxResponseTime,
      successRate,
      iterations
    });
    
    console.log(`   ✅ 평균 응답시간: ${Math.round(avgResponseTime)}ms`);
    console.log(`   📊 최소/최대: ${minResponseTime}ms / ${maxResponseTime}ms`);
    console.log(`   🎯 성공률: ${successRate.toFixed(1)}%`);
    console.log('');
  }
  
  // 결과 요약
  console.log('📊 성능 테스트 결과 요약');
  console.log('='.repeat(80));
  console.log('API 이름'.padEnd(20) + '평균(ms)'.padEnd(10) + '최소(ms)'.padEnd(10) + '최대(ms)'.padEnd(10) + '성공률(%)');
  console.log('-'.repeat(80));
  
  results.forEach(result => {
    console.log(
      result.name.padEnd(20) + 
      result.avgResponseTime.toString().padEnd(10) + 
      result.minResponseTime.toString().padEnd(10) + 
      result.maxResponseTime.toString().padEnd(10) + 
      result.successRate.toFixed(1).padEnd(10)
    );
  });
  
  console.log('-'.repeat(80));
  
  const overallAvg = results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length;
  const overallSuccess = results.reduce((sum, r) => sum + r.successRate, 0) / results.length;
  
  console.log(`전체 평균 응답시간: ${Math.round(overallAvg)}ms`);
  console.log(`전체 성공률: ${overallSuccess.toFixed(1)}%`);
  
  // 성능 기준 평가
  const fastAPIs = results.filter(r => r.avgResponseTime < 1000).length;
  const slowAPIs = results.filter(r => r.avgResponseTime > 3000).length;
  
  console.log('\n🎯 성능 평가:');
  console.log(`   빠른 API (< 1초): ${fastAPIs}개`);
  console.log(`   느린 API (> 3초): ${slowAPIs}개`);
  
  if (overallAvg < 2000 && overallSuccess > 80) {
    console.log('   ✅ 전체 성능이 우수합니다!');
  } else if (overallAvg < 5000 && overallSuccess > 60) {
    console.log('   ⚠️  성능이 보통 수준입니다.');
  } else {
    console.log('   ❌ 성능 개선이 필요합니다.');
  }
}

runPerformanceTests().catch(console.error);
