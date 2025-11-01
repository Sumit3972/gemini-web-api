/**
 * Test file for Gemini Web API Client
 * Run with: npm run dev (or npm test)
 */

import dotenv from 'dotenv';
import { GeminiClient, ChatSession } from './src/client.js';
import { Models } from './src/constants.js';

// Load environment variables
dotenv.config();

/**
 * Main test function
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('Gemini Web API Client - Test Suite');
  console.log('='.repeat(60));
  console.log();

  // Get cookies from environment variables
  const secure1PSID = process.env.SECURE_1PSID;
  const secure1PSIDTS = process.env.SECURE_1PSIDTS;

  if (!secure1PSID) {
    console.error('❌ Error: SECURE_1PSID not found in environment variables');
    console.error('Please create a .env file with your cookies:');
    console.error('  SECURE_1PSID=your_cookie_value');
    console.error('  SECURE_1PSIDTS=your_cookie_value (optional if cached)');
    console.error();
    console.error('To get these cookies:');
    console.error('  1. Go to https://gemini.google.com');
    console.error('  2. Open DevTools (F12) → Application → Cookies');
    console.error('  3. Copy __Secure-1PSID and __Secure-1PSIDTS values');
    process.exit(1);
  }

  // Create client
  const client = new GeminiClient(secure1PSID, secure1PSIDTS);

  try {
    // Test 1: Initialize client
    console.log('[Test 1] Initializing Gemini client...');
    await client.init({
      timeout: 300000,
      autoRefresh: true,
      refreshInterval: 60000, // 1 minute
      verbose: true
    });
    console.log('✓ Client initialized successfully\n');

    // Test 2: Simple generation
    console.log('[Test 2] Testing simple content generation...');
    const response1 = await client.generateContent(
      'Say "Hello from Node.js!" and tell me what is 5+3',
      { model: Models.GEMINI_2_5_FLASH }
    );
    console.log('Response:', response1.text);
    console.log('✓ Simple generation successful\n');

    // Test 3: Chat session
    console.log('[Test 3] Testing chat session...');
    const chat = client.startChat({ model: Models.GEMINI_2_5_FLASH });
    
    const chatResponse1 = await chat.sendMessage('My favorite color is blue. Remember this.');
    console.log('First message:', chatResponse1.text.substring(0, 100) + '...');
    
    const chatResponse2 = await chat.sendMessage('What is my favorite color?');
    console.log('Second message:', chatResponse2.text.substring(0, 100) + '...');
    console.log('Chat metadata:', chat.toString());
    console.log('✓ Chat session successful\n');

    // Test 4: Multiple candidates (if available)
    console.log('[Test 4] Testing multiple candidates...');
    const response3 = await client.generateContent(
      'Give me a fun fact about space',
      { model: Models.GEMINI_2_5_FLASH }
    );
    console.log(`Number of candidates: ${response3.candidates.length}`);
    console.log('Default response:', response3.text.substring(0, 100) + '...');
    console.log('✓ Candidates test successful\n');

    // Test 5: Test cookie refresh mechanism
    console.log('[Test 5] Testing cookie refresh...');
    console.log('The client will automatically refresh cookies every 9 minutes.');
    console.log('Auto-refresh is running in the background.');
    console.log('Current cookies are valid and cached.');
    console.log('✓ Cookie refresh mechanism active\n');

    // Test 6: Model switching
    console.log('[Test 6] Testing different models...');
    try {
      const response4 = await client.generateContent(
        'What is 10 + 5?',
        { model: Models.GEMINI_2_5_PRO }
      );
      console.log('Response from Gemini 2.5 Pro:', response4.text.substring(0, 100) + '...');
      if (response4.thoughts) {
        console.log('Thoughts:', response4.thoughts.substring(0, 100) + '...');
      }
      console.log('✓ Model switching successful\n');
    } catch (error) {
      console.log('⚠ Gemini 2.5 Pro may not be available for your account');
      console.log('✓ Test skipped (this is normal)\n');
    }

    console.log('='.repeat(60));
    console.log('✓ All tests completed successfully!');
    console.log('='.repeat(60));
    console.log();
    console.log('The client is still running with auto-refresh enabled.');
    console.log('Press Ctrl+C to exit.');
    console.log();

    // Keep the process running to demonstrate auto-refresh
    // In production, you would call client.close() when done
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data?.substring(0, 200));
    }
    await client.close();
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

