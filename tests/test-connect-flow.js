const fetch = require('node-fetch');

async function testConnectFlow() {
  // First login
  const formData = new URLSearchParams();
  formData.append('username', 'chetan@omegaintelligence.ai');
  formData.append('password', 'Test123.');
  
  const loginResponse = await fetch('http://localhost:8000/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  const loginData = await loginResponse.json();
  const token = loginData.access_token;
  console.log('1. Logged in successfully');

  // Test connect with proper headers (simulating browser request)
  console.log('\n2. Testing connect endpoint with browser-like headers...');
  const connectResponse = await fetch('http://localhost:8000/api/integrations/box/connect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
      'Referer': 'http://localhost:3000/account?tab=integrations'
    }
  });

  console.log('Response status:', connectResponse.status);
  
  if (connectResponse.ok) {
    const connectData = await connectResponse.json();
    console.log('\n3. Connect response:');
    console.log('Session token:', connectData.session_token ? 'Present' : 'Missing');
    console.log('Vault URL:', connectData.vault_url);
    
    // Extract callback URL from session token
    if (connectData.session_token) {
      try {
        const tokenParts = connectData.session_token.split('.');
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('\n4. Session token details:');
        console.log('Redirect URI:', payload.redirect_uri);
        console.log('Consumer ID:', payload.consumer_id);
        console.log('Unified APIs:', payload.settings?.unified_apis);
      } catch (e) {
        console.log('Could not decode session token');
      }
    }
    
    console.log('\n5. To test the integration:');
    console.log('   a) Open this URL in your browser:', connectData.vault_url);
    console.log('   b) Click on Box');
    console.log('   c) Click "Authorize"');
    console.log('   d) Log in with your Box credentials');
    console.log('   e) You should be redirected back to the app');
  } else {
    const errorText = await connectResponse.text();
    console.error('Connect failed:', errorText);
  }
}

testConnectFlow().catch(console.error);