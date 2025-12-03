#!/usr/bin/env node

// Simple test script to verify authentication endpoints
const https = require('https');

const BACKEND_URL = 'https://friendly-friends-app-full.onrender.com';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FriendlyFriends-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testEndpoints() {
  console.log('🧪 Testing Friendly Friends Authentication...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await makeRequest('/');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data, null, 2)}\n`);

    // Test 2: Login endpoint
    console.log('2. Testing login endpoint...');
    const login = await makeRequest('/api/login', 'POST', {
      username: 'admin',
      password: 'admin123'
    });
    console.log(`   Status: ${login.status}`);
    console.log(`   Response: ${JSON.stringify(login.data, null, 2)}\n`);

    // Test 3: Join request endpoint
    console.log('3. Testing join request endpoint...');
    const joinRequest = await makeRequest('/api/join-requests', 'POST', {
      name: 'testuser',
      password: 'testpass123'
    });
    console.log(`   Status: ${joinRequest.status}`);
    console.log(`   Response: ${JSON.stringify(joinRequest.data, null, 2)}\n`);

    // Test 4: CORS headers check
    console.log('4. Checking CORS headers...');
    const corsTest = await makeRequest('/', 'OPTIONS');
    console.log(`   Status: ${corsTest.status}`);
    console.log(`   CORS Headers:`);
    Object.keys(corsTest.headers).forEach(header => {
      if (header.toLowerCase().includes('access-control')) {
        console.log(`     ${header}: ${corsTest.headers[header]}`);
      }
    });

    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints();