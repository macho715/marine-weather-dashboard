#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, {
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

async function runIntegrationTests() {
  console.log('🧪 전체 시스템 통합 테스트 시작\n');
  
  const tests = [];
  
  // 1. Health API 테스트
  console.log('1️⃣ Health API 테스트');
  try {
    const health = await makeRequest(`${BASE_URL}/api/health/`);
    tests.push({
      name: 'Health API',
      status: health.status === 200 ? '✅ PASS' : '❌ FAIL',
      details: health.data
    });
    console.log(`   ${health.status === 200 ? '✅' : '❌'} Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data, null, 2)}\n`);
  } catch (error) {
    tests.push({
      name: 'Health API',
      status: '❌ FAIL',
      details: error.message
    });
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // 2. Vessel API 테스트
  console.log('2️⃣ Vessel API 테스트');
  try {
    const vessel = await makeRequest(`${BASE_URL}/api/vessel/`);
    tests.push({
      name: 'Vessel API',
      status: vessel.status === 200 ? '✅ PASS' : '❌ FAIL',
      details: vessel.data
    });
    console.log(`   ${vessel.status === 200 ? '✅' : '❌'} Status: ${vessel.status}`);
    console.log(`   Vessel: ${vessel.data?.vessel?.name || 'N/A'}`);
    console.log(`   Schedule Count: ${vessel.data?.schedule?.length || 0}\n`);
  } catch (error) {
    tests.push({
      name: 'Vessel API',
      status: '❌ FAIL',
      details: error.message
    });
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // 3. Marine API 테스트
  console.log('3️⃣ Marine API 테스트');
  try {
    const marine = await makeRequest(`${BASE_URL}/api/marine/?port=Jebel%20Ali`);
    tests.push({
      name: 'Marine API',
      status: marine.status === 200 ? '✅ PASS' : '❌ FAIL',
      details: marine.data
    });
    console.log(`   ${marine.status === 200 ? '✅' : '❌'} Status: ${marine.status}`);
    if (marine.status === 200) {
      console.log(`   Port: ${marine.data?.port || 'N/A'}`);
      console.log(`   Wave Height: ${marine.data?.hs || 'N/A'}m`);
      console.log(`   Wind Speed: ${marine.data?.windKt || 'N/A'}kt`);
    } else {
      console.log(`   Response: ${JSON.stringify(marine.data, null, 2)}`);
    }
    console.log('');
  } catch (error) {
    tests.push({
      name: 'Marine API',
      status: '❌ FAIL',
      details: error.message
    });
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // 4. Briefing API 테스트
  console.log('4️⃣ Briefing API 테스트');
  try {
    const briefingData = {
      current_time: '2025-09-29T15:30:00Z',
      vessel_name: 'JOPETWIL 71',
      vessel_status: 'Ready @ MW4',
      current_voyage: '69th',
      schedule: [{
        id: '69th',
        cargo: 'Dune Sand',
        etd: '2025-09-28T16:00:00Z',
        eta: '2025-09-29T04:00:00Z',
        status: 'Scheduled'
      }]
    };
    
    const briefing = await makeRequest(`${BASE_URL}/api/briefing/`, {
      method: 'POST',
      body: briefingData
    });
    
    tests.push({
      name: 'Briefing API',
      status: briefing.status === 200 ? '✅ PASS' : '❌ FAIL',
      details: briefing.data
    });
    console.log(`   ${briefing.status === 200 ? '✅' : '❌'} Status: ${briefing.status}`);
    if (briefing.status === 200) {
      console.log(`   Briefing Length: ${briefing.data?.briefing?.length || 0} chars`);
    } else {
      console.log(`   Response: ${JSON.stringify(briefing.data, null, 2)}`);
    }
    console.log('');
  } catch (error) {
    tests.push({
      name: 'Briefing API',
      status: '❌ FAIL',
      details: error.message
    });
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // 5. Report API 테스트
  console.log('5️⃣ Report API 테스트');
  try {
    const report = await makeRequest(`${BASE_URL}/api/report/`);
    tests.push({
      name: 'Report API',
      status: report.status === 200 ? '✅ PASS' : '❌ FAIL',
      details: report.data
    });
    console.log(`   ${report.status === 200 ? '✅' : '❌'} Status: ${report.status}`);
    if (report.status === 200) {
      console.log(`   Report OK: ${report.data?.ok || false}`);
      console.log(`   Slot: ${report.data?.slot || 'N/A'}`);
      console.log(`   Sent Channels: ${report.data?.sent?.length || 0}`);
    } else {
      console.log(`   Response: ${JSON.stringify(report.data, null, 2)}`);
    }
    console.log('');
  } catch (error) {
    tests.push({
      name: 'Report API',
      status: '❌ FAIL',
      details: error.message
    });
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // 6. Vessel Actions API 테스트
  console.log('6️⃣ Vessel Actions API 테스트');
  try {
    const action = await makeRequest(`${BASE_URL}/api/vessel/actions/`, {
      method: 'POST',
      body: { action: 'quick-go' }
    });
    
    tests.push({
      name: 'Vessel Actions API',
      status: action.status === 200 ? '✅ PASS' : '❌ FAIL',
      details: action.data
    });
    console.log(`   ${action.status === 200 ? '✅' : '❌'} Status: ${action.status}`);
    if (action.status === 200) {
      console.log(`   Action: ${action.data?.action || 'N/A'}`);
      console.log(`   Message: ${action.data?.message || 'N/A'}`);
    } else {
      console.log(`   Response: ${JSON.stringify(action.data, null, 2)}`);
    }
    console.log('');
  } catch (error) {
    tests.push({
      name: 'Vessel Actions API',
      status: '❌ FAIL',
      details: error.message
    });
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // 7. Assistant API 테스트
  console.log('7️⃣ Assistant API 테스트');
  try {
    const formData = new URLSearchParams();
    formData.append('prompt', 'weather');
    formData.append('model', 'gpt-4.1-mini');
    
    const assistant = await makeRequest(`${BASE_URL}/api/assistant/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    tests.push({
      name: 'Assistant API',
      status: assistant.status === 200 ? '✅ PASS' : '❌ FAIL',
      details: assistant.data
    });
    console.log(`   ${assistant.status === 200 ? '✅' : '❌'} Status: ${assistant.status}`);
    if (assistant.status === 200) {
      console.log(`   Answer Length: ${assistant.data?.answer?.length || 0} chars`);
    } else {
      console.log(`   Response: ${JSON.stringify(assistant.data, null, 2)}`);
    }
    console.log('');
  } catch (error) {
    tests.push({
      name: 'Assistant API',
      status: '❌ FAIL',
      details: error.message
    });
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // 결과 요약
  console.log('📊 통합 테스트 결과 요약');
  console.log('='.repeat(50));
  
  const passed = tests.filter(t => t.status.includes('✅')).length;
  const failed = tests.filter(t => t.status.includes('❌')).length;
  
  tests.forEach(test => {
    console.log(`${test.status} ${test.name}`);
  });
  
  console.log('='.repeat(50));
  console.log(`총 테스트: ${tests.length}개`);
  console.log(`✅ 성공: ${passed}개`);
  console.log(`❌ 실패: ${failed}개`);
  console.log(`성공률: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 모든 통합 테스트가 성공적으로 완료되었습니다!');
  } else {
    console.log('\n⚠️  일부 테스트가 실패했습니다. 위의 상세 정보를 확인하세요.');
  }
}

runIntegrationTests().catch(console.error);
