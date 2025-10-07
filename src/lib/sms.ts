// Dynamic import to avoid module resolution issues
let Client: any

const httpFetchClient = {
  get: async <T>(url: string, headers?: Record<string, string>): Promise<T> => {
    const response = await fetch(url, {
      method: "GET",
      headers
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  post: async <T>(url: string, body: any, headers?: Record<string, string>): Promise<T> => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  put: async <T>(url: string, body: any, headers?: Record<string, string>): Promise<T> => {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  patch: async <T>(url: string, body: any, headers?: Record<string, string>): Promise<T> => {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
  delete: async <T>(url: string, headers?: Record<string, string>): Promise<T> => {
    const response = await fetch(url, {
      method: "DELETE",
      headers
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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
    console.log('SMS Service - Starting SMS send process')
    console.log('SMS Service - Username:', username)
    console.log('SMS Service - Has Password:', !!password)
    console.log('SMS Service - Phone Numbers:', body.phoneNumbers)
    console.log('SMS Service - Message Length:', body.message.length)
    
    // Dynamic import to avoid module resolution issues
    if (!Client) {
      const AndroidSMSGateway = await import('android-sms-gateway')
      Client = AndroidSMSGateway.default
    }
    
    // Create the message object according to the API documentation
    const message = {
      message: body.message,
      phoneNumbers: body.phoneNumbers,
      withDeliveryReport: true,
      ttl: 3600 // 1 hour TTL
    };
    
    console.log('SMS Service - Creating Client instance')
    const api = new Client(username, password, httpFetchClient);
    
    console.log('SMS Service - Sending SMS via gateway')
    const state = await api.send(message);
    
    console.log('SMS Service - SMS Result:', state);
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
    console.error('SMS Error Details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return {
      success: false,
      error: err.message || 'Failed to send SMS'
    };
  }
}

export const testSMSConnection = async (username: string, password: string): Promise<SMSResult> => {
  try {
    console.log('Testing SMS connection with username:', username)
    
    // Dynamic import to avoid module resolution issues
    if (!Client) {
      const AndroidSMSGateway = await import('android-sms-gateway')
      Client = AndroidSMSGateway.default
    }
    
    const api = new Client(username, password, httpFetchClient);
    
    // Try to get health status to test connection
    console.log('Testing connection by checking health status...')
    const health = await api.getHealth();
    
    console.log('Health check result:', health)
    
    return {
      success: true,
      messageId: 'test-connection'
    };

  } catch (err: any) {
    console.error('SMS connection test error:', err)
    
    // If it's an authentication error, that's what we want to test
    if (err.message?.includes('auth') || err.message?.includes('credential') || err.message?.includes('401')) {
      return {
        success: false,
        error: 'Authentication failed. Please check your username and password.'
      };
    }
    
    // If it's a network error, that means credentials might be correct but network issue
    if (err.message?.includes('network') || err.message?.includes('fetch')) {
      return {
        success: false,
        error: 'Network error. Please check your internet connection and SMS gateway URL.'
      };
    }
    
    return {
      success: false,
      error: err.message || 'Connection test failed'
    };
  }
}
