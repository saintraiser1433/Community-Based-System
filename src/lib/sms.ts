import AndroidSMSGateway from 'android-sms-gateway'

const httpFetchClient = {
  get: async (url: string, headers: any) => {
    const response = await fetch(url, {
      method: "GET",
      headers
    });
    return response.json();
  },
  post: async (url: string, body: any, headers: any) => {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    return response.json();
  },
  delete: async (url: string, headers: any) => {
    const response = await fetch(url, {
      method: "DELETE",
      headers
    });
    return response.json();
  }
};

export interface SMSMessage {
  message: string
  phoneNumbers: string[]
}

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

export const sendSMS = async (username: string, password: string, body: SMSMessage): Promise<SMSResult> => {
  try {
    const messages = {
      phoneNumbers: body.phoneNumbers,
      message: body.message
    };
    
    const api = new AndroidSMSGateway(username, password, httpFetchClient);
    const state = await api.send(messages);
    
    console.log('SMS Message ID:', state.id);

    // Check status after 5 seconds
    setTimeout(async () => {
      try {
        const updatedState = await api.getState(state.id);
        console.log('SMS Message status:', updatedState.state);
      } catch (err) {
        console.error('Error checking SMS status:', err);
      }
    }, 5000);

    return {
      success: true,
      messageId: state.id
    };

  } catch (err: any) {
    console.error('SMS sending error:', err);
    return {
      success: false,
      error: err.message || 'Failed to send SMS'
    };
  }
}

export const testSMSConnection = async (username: string, password: string): Promise<SMSResult> => {
  try {
    const api = new AndroidSMSGateway(username, password, httpFetchClient);
    
    // Try to get account info or make a simple API call to test connection
    // This is a basic test - you might need to adjust based on the actual API
    const testMessage: SMSMessage = {
      message: 'Test SMS from MSWDO-GLAN CBDS',
      phoneNumbers: [] // Empty array for test
    };
    
    // For testing, we'll just try to initialize the client
    // The actual send will fail with empty phone numbers, but we can catch the auth error
    await api.send(testMessage);
    
    return {
      success: true,
      messageId: 'test-connection'
    };

  } catch (err: any) {
    // If it's an authentication error, that's what we want to test
    if (err.message?.includes('auth') || err.message?.includes('credential') || err.message?.includes('401')) {
      return {
        success: false,
        error: 'Authentication failed. Please check your username and password.'
      };
    }
    
    // If it's a different error (like empty phone numbers), that means auth worked
    if (err.message?.includes('phone') || err.message?.includes('number')) {
      return {
        success: true,
        messageId: 'test-connection'
      };
    }
    
    return {
      success: false,
      error: err.message || 'Connection test failed'
    };
  }
}
