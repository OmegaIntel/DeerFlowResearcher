const fetch = require('node-fetch');

async function testDirectAPI() {
  // First login to get token
  console.log('1. Testing login...');
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
  console.log('Login response:', loginResponse.status, loginData);

  if (!loginData.access_token) {
    console.error('No access token received');
    return;
  }

  const token = loginData.access_token;
  console.log('2. Got token:', token.substring(0, 20) + '...');

  // Test integrations endpoint
  console.log('\n3. Testing integrations list...');
  const integrationsResponse = await fetch('http://localhost:8000/api/integrations', {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  console.log('Integrations response:', integrationsResponse.status);
  const integrations = await integrationsResponse.json();
  console.log('Integrations:', JSON.stringify(integrations, null, 2));

  // Test enabling Box
  console.log('\n4. Testing enable Box integration...');
  const enableResponse = await fetch('http://localhost:8000/api/integrations/box/enable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  console.log('Enable response:', enableResponse.status);
  const enableData = await enableResponse.json();
  console.log('Enable data:', JSON.stringify(enableData, null, 2));

  // Test connecting to Box
  if (enableResponse.ok) {
    console.log('\n5. Testing connect Box integration...');
    const connectResponse = await fetch('http://localhost:8000/api/integrations/box/connect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Connect response:', connectResponse.status);
    const connectData = await connectResponse.json();
    console.log('Connect data:', JSON.stringify(connectData, null, 2));
  }
}

testDirectAPI().catch(console.error);