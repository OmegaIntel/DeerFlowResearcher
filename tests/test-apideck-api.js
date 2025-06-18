const fetch = require('node-fetch');

async function testAPIDeckAPI() {
  const APIDECK_API_KEY = 'sk_live_96f22e11-2f19-44ed-8944-bf85f3947e09-cwW0MgCRfQpddbzUj9-ea6f37cb-5507-4afa-91c8-9a5161398d05';
  const APIDECK_APP_ID = '542ILzBvOLf4rTRazUj8oiZsW51VtEKtyLeuzUj9';
  const consumer_id = 'test-user-123';
  
  console.log('Testing APIdeck Vault session creation...');
  
  const headers = {
    'Authorization': `Bearer ${APIDECK_API_KEY}`,
    'x-apideck-app-id': APIDECK_APP_ID,
    'x-apideck-consumer-id': consumer_id,
    'Content-Type': 'application/json'
  };
  
  const vaultData = {
    consumer_metadata: {
      user_id: 'test-user-123',
      email: 'test@example.com',
      full_name: 'Test User'
    },
    redirect_uri: 'http://localhost:3000/account?tab=integrations&connected=box',
    settings: {
      unified_apis: ['file-storage', 'crm']
    }
  };
  
  try {
    const response = await fetch('https://unify.apideck.com/vault/sessions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(vaultData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 200) {
      const data = JSON.parse(responseText);
      console.log('\nSuccess! Session token:', data.data?.session_token);
      console.log('Vault URL:', `https://vault.apideck.com/session/${data.data?.session_token}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPIDeckAPI();