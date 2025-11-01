/**
 * Gemini API Server
 * Express REST API for Gemini Web Client
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GeminiClient } from './client.js';
import { Models } from './constants.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Global client instance (for default .env cookies)
let geminiClient = null;

/**
 * Initialize Gemini client from environment variables
 */
async function initializeClient() {
  const secure1PSID = process.env.SECURE_1PSID;
  const secure1PSIDTS = process.env.SECURE_1PSIDTS;

  if (!secure1PSID) {
    console.warn('⚠️  Warning: SECURE_1PSID not found in environment variables');
    console.warn('Server will run in multi-user mode only (cookies required in payload)');
    return;
  }

  try {
    geminiClient = new GeminiClient(secure1PSID, secure1PSIDTS);
    
    await geminiClient.init({
      timeout: 300000,
      autoRefresh: true,
      refreshInterval: 60000, // 1 minute
      verbose: true
    });

    console.log('✓ Global Gemini client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize global client:', error.message);
    console.warn('Server will run in multi-user mode only (cookies required in payload)');
    geminiClient = null; // Reset to null on failure
  }
}

/**
 * Create a temporary client instance with custom cookies
 * @param {string} secure1PSID - User's __Secure-1PSID cookie
 * @param {string} secure1PSIDTS - User's __Secure-1PSIDTS cookie
 * @returns {Promise<GeminiClient>}
 */
async function createUserClient(secure1PSID, secure1PSIDTS) {
  const userClient = new GeminiClient(secure1PSID, secure1PSIDTS);
  await userClient.init({
    timeout: 300000,
    autoRefresh: false, // Disable auto-refresh for temporary clients
    verbose: false
  });
  return userClient;
}

/**
 * Normalize cookie keys to lowercase (handle both SECURE_1PSID and secure1PSID)
 * @param {Object} cookies - Cookies object
 * @returns {Object} Normalized cookies
 */
function normalizeCookies(cookies) {
  if (!cookies) return null;
  
  const normalized = {};
  for (const [key, value] of Object.entries(cookies)) {
    const lowerKey = key.toLowerCase().replace(/_/g, '').replace('secure', 'secure');
    if (lowerKey.includes('secure1psid') && !lowerKey.includes('ts')) {
      normalized.secure1PSID = value;
    } else if (lowerKey.includes('secure1psidts')) {
      normalized.secure1PSIDTS = value;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

/**
 * Get client instance - either from custom cookies or global default
 * @param {Object} cookies - Optional custom cookies { secure1PSID, secure1PSIDTS } or { SECURE_1PSID, SECURE_1PSIDTS }
 * @returns {Promise<{client: GeminiClient, isTemporary: boolean}>}
 */
async function getClientInstance(cookies = null) {
  // Normalize cookie keys to handle both uppercase and lowercase
  const normalizedCookies = normalizeCookies(cookies);
  
  if (normalizedCookies && normalizedCookies.secure1PSID) {
    // Create temporary client with user's cookies
    const client = await createUserClient(normalizedCookies.secure1PSID, normalizedCookies.secure1PSIDTS);
    return { client, isTemporary: true };
  }
  
  // Lazy initialization for global client (important for serverless)
  if (!geminiClient) {
    const secure1PSID = process.env.SECURE_1PSID;
    if (!secure1PSID) {
      throw new Error('No cookies provided. Please include cookies in request payload: { "cookies": { "secure1PSID": "your-cookie-here", "secure1PSIDTS": "your-cookie-here" } }');
    }
    
    console.log('[Lazy Init] Initializing global client...');
    await initializeClient();
    
    if (!geminiClient) {
      throw new Error('Failed to initialize global client. Please provide valid cookies in request payload.');
    }
  }
  
  return { client: geminiClient, isTemporary: false };
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Gemini API Server is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/generate
 * Generate content from a single prompt
 * 
 * Body:
 * {
 *   "prompt": "Your prompt here",
 *   "model": "gemini-2.0-flash-exp" (optional),
 *   "cookies": {                         (optional - for multi-user support)
 *     "secure1PSID": "your_cookie",
 *     "secure1PSIDTS": "your_cookie"
 *   }
 * }
 */
app.post('/api/generate', async (req, res) => {
  let tempClient = null;
  
  try {
    const { prompt, model, cookies } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prompt is required'
      });
    }

    // Get client instance (custom or global)
    const { client, isTemporary } = await getClientInstance(cookies);
    if (isTemporary) {
      tempClient = client; // Store for cleanup
    }

    const response = await client.generateContent(prompt, {
      model: model || Models.GEMINI_2_5_FLASH
    });

    res.json({
      success: true,
      data: {
        text: response.text,
        thoughts: response.thoughts || null,
        images: response.images || [],
        webImages: response.webImages || [],
        generatedImages: response.generatedImages || [],
        fileAttachments: response.fileAttachments || [],
        codeBlocks: response.codeBlocks || [],
        codeExecutionResult: response.codeExecutionResult || null,
        sources: response.sources || [],
        factuality: response.factuality || null,
        candidates: response.candidates.length,
        model: model || Models.GEMINI_2_5_FLASH
      }
    });

  } catch (error) {
    console.error('Error in /api/generate:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  } finally {
    // Cleanup temporary client
    if (tempClient) {
      await tempClient.close();
    }
  }
});

/**
 * POST /api/chat/start
 * Start a new chat session
 * 
 * Body:
 * {
 *   "model": "gemini-2.0-flash-exp" (optional),
 *   "cookies": {                         (optional - for multi-user support)
 *     "secure1PSID": "your_cookie",
 *     "secure1PSIDTS": "your_cookie"
 *   }
 * }
 * 
 * Returns: { chatId: string }
 */
const chatSessions = new Map(); // { chatId: { chat, client, isUserClient } }

app.post('/api/chat/start', async (req, res) => {
  try {
    const { model, cookies } = req.body;

    // Get client instance (custom or global)
    const { client, isTemporary } = await getClientInstance(cookies);

    const chat = client.startChat({
      model: model || Models.GEMINI_2_5_FLASH
    });

    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store chat session with client reference
    chatSessions.set(chatId, {
      chat,
      client: isTemporary ? client : null, // Store client only if temporary
      isUserClient: isTemporary
    });

    res.json({
      success: true,
      data: {
        chatId,
        model: model || Models.GEMINI_2_5_FLASH,
        message: 'Chat session started',
        usingCustomCookies: isTemporary
      }
    });

  } catch (error) {
    console.error('Error in /api/chat/start:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/chat/message
 * Send a message in an existing chat session
 * 
 * Body:
 * {
 *   "chatId": "chat_xxx",
 *   "message": "Your message here"
 * }
 */
app.post('/api/chat/message', async (req, res) => {
  try {
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'chatId and message are required'
      });
    }

    const sessionData = chatSessions.get(chatId);
    if (!sessionData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Chat session not found'
      });
    }

    const response = await sessionData.chat.sendMessage(message);

    res.json({
      success: true,
      data: {
        chatId,
        text: response.text,
        thoughts: response.thoughts || null,
        images: response.images || [],
        webImages: response.webImages || [],
        generatedImages: response.generatedImages || [],
        fileAttachments: response.fileAttachments || [],
        codeBlocks: response.codeBlocks || [],
        codeExecutionResult: response.codeExecutionResult || null,
        sources: response.sources || [],
        factuality: response.factuality || null,
        candidates: response.candidates.length
      }
    });

  } catch (error) {
    console.error('Error in /api/chat/message:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * DELETE /api/chat/:chatId
 * End a chat session and cleanup resources
 */
app.delete('/api/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatSessions.has(chatId)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Chat session not found'
      });
    }

    const sessionData = chatSessions.get(chatId);
    
    // Cleanup temporary user client if exists
    if (sessionData.client && sessionData.isUserClient) {
      await sessionData.client.close();
    }

    chatSessions.delete(chatId);

    res.json({
      success: true,
      message: 'Chat session ended'
    });

  } catch (error) {
    console.error('Error in DELETE /api/chat/:chatId:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/models
 * Get available models
 */
app.get('/api/models', (req, res) => {
  res.json({
    success: true,
    data: {
      models: Object.values(Models),
      default: Models.GEMINI_2_5_FLASH
    }
  });
});

/**
 * GET /api/chat/sessions
 * Get all active chat sessions
 */
app.get('/api/chat/sessions', (req, res) => {
  res.json({
    success: true,
    data: {
      activeSessions: Array.from(chatSessions.keys()),
      count: chatSessions.size
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found'
  });
});

// Start server
async function startServer() {
  try {
    console.log('='.repeat(60));
    console.log('Gemini API Server - Initializing');
    console.log('='.repeat(60));
    console.log();

    await initializeClient();

    app.listen(PORT, () => {
      console.log();
      console.log('='.repeat(60));
      console.log(`✓ Server is running on http://localhost:${PORT}`);
      console.log('='.repeat(60));
      console.log();
      console.log('Available endpoints:');
      console.log(`  GET    http://localhost:${PORT}/health`);
      console.log(`  GET    http://localhost:${PORT}/api/models`);
      console.log(`  POST   http://localhost:${PORT}/api/generate`);
      console.log(`  POST   http://localhost:${PORT}/api/chat/start`);
      console.log(`  POST   http://localhost:${PORT}/api/chat/message`);
      console.log(`  GET    http://localhost:${PORT}/api/chat/sessions`);
      console.log(`  DELETE http://localhost:${PORT}/api/chat/:chatId`);
      console.log();
      console.log('Press Ctrl+C to stop the server');
      console.log('='.repeat(60));
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  
  // Close all user clients in chat sessions
  for (const [chatId, sessionData] of chatSessions.entries()) {
    if (sessionData.client && sessionData.isUserClient) {
      await sessionData.client.close();
    }
  }
  chatSessions.clear();
  
  // Close global client
  if (geminiClient) {
    await geminiClient.close();
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nShutting down gracefully...');
  
  // Close all user clients in chat sessions
  for (const [chatId, sessionData] of chatSessions.entries()) {
    if (sessionData.client && sessionData.isUserClient) {
      await sessionData.client.close();
    }
  }
  chatSessions.clear();
  
  // Close global client
  if (geminiClient) {
    await geminiClient.close();
  }
  
  process.exit(0);
});

// Initialize for Vercel serverless environment
let isInitialized = false;

async function initForVercel() {
  if (!isInitialized) {
    await initializeClient();
    isInitialized = true;
  }
}

// For Vercel serverless deployment
if (process.env.VERCEL) {
  // Initialize on cold start
  initForVercel().catch(console.error);
} else {
  // Start the server locally
  startServer();
}

// Export for Vercel
export default app;
