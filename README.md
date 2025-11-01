# 🎯 Gemini Web API - Complete Developer Guide

A comprehensive Node.js client for Google Gemini with REST API server, automatic cookie management, and full content extraction.

---

## ✨ Features

- ✅ **Complete Response Parsing** - Text, images, code, files, sources, and more
- ✅ **REST API Server** - Production-ready Express.js server
- ✅ **Multi-User Support** - Each user can provide their own cookies
- ✅ **Chat Sessions** - Multi-turn conversations with context
- ✅ **Auto Cookie Refresh** - Automatic session management
- ✅ **Multiple Models** - Flash and Pro models with thinking capabilities
- ✅ **Code Extraction** - File attachments and code blocks
- ✅ **Image Support** - Web search and AI-generated images
- ✅ **Postman Collection** - Ready-to-import API testing

---

## 📦 Installation

```bash
npm install
```

---

## 🔑 Setup

### 1. Get Gemini Cookies

1. Visit [https://gemini.google.com](https://gemini.google.com)
2. Open DevTools (F12) → **Application** → **Cookies**
3. Copy these cookies:
   - `__Secure-1PSID`
   - `__Secure-1PSIDTS`

### 2. Create `.env` File

```env
SECURE_1PSID=your_cookie_value_here
SECURE_1PSIDTS=your_cookie_value_here
PORT=3000
```

---

## 🚀 Quick Start

### Start the Server

```bash
npm run server
```

Server runs at: `http://localhost:3000`

### Test the API

```bash
curl http://localhost:3000/health
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/models` | List available models |
| POST | `/api/generate` | Generate content |
| POST | `/api/chat/start` | Start chat session |
| POST | `/api/chat/message` | Send chat message |
| GET | `/api/chat/sessions` | List active sessions |
| DELETE | `/api/chat/:chatId` | End chat session |

---

## 💻 API Usage & Examples

### 1. Health Check

```bash
GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Gemini API Server is running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

### 2. Get Available Models

```bash
GET http://localhost:3000/api/models
```

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      "gemini-2.0-flash-exp",
      "gemini-2.5-flash-002",
      "gemini-2.5-pro-002"
    ],
    "default": "gemini-2.0-flash-exp"
  }
}
```

---

### 3. Generate Content

**Endpoint:** `POST /api/generate`

#### Example 1: Simple Text Question

**Request:**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is quantum computing?"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Quantum computing is a type of computing that uses quantum mechanics...",
    "thoughts": null,
    "images": [],
    "webImages": [],
    "generatedImages": [],
    "codeBlocks": [],
    "codeExecutionResult": null,
    "sources": [],
    "factuality": null,
    "candidates": 1,
    "model": "gemini-2.0-flash-exp"
  }
}
```

#### Example 2: Code Generation

**Request:**
```json
{
  "prompt": "Write a Python function to reverse a string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Here's a Python function to reverse a string:\n\n```python\ndef reverse_string(s):\n    return s[::-1]\n```",
    "codeBlocks": [
      {
        "language": "python",
        "code": "def reverse_string(s):\n    return s[::-1]"
      }
    ],
    "images": [],
    "thoughts": null
  }
}
```

#### Example 3: With Specific Model

**Request:**
```json
{
  "prompt": "Solve: 2x + 5 = 15",
  "model": "gemini-2.5-pro-002"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "x = 5",
    "thoughts": "Let me solve this step by step:\n1. We have 2x + 5 = 15\n2. Subtract 5: 2x = 10\n3. Divide by 2: x = 5",
    "codeBlocks": []
  }
}
```

#### Example 4: Multi-User Support (Custom Cookies)

**NEW!** 🎉 Each user can provide their own cookies in the request payload for multi-user support.

**Request:**
```json
{
  "prompt": "What is artificial intelligence?",
  "model": "gemini-2.0-flash-exp",
  "cookies": {
    "secure1PSID": "user_specific_cookie_value",
    "secure1PSIDTS": "user_specific_cookie_value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Artificial intelligence (AI) is...",
    "thoughts": null,
    "images": [],
    "codeBlocks": [],
    "candidates": 1,
    "model": "gemini-2.0-flash-exp"
  }
}
```

**Benefits:**
- ✅ **Multi-user support** - Different users can use their own Google accounts
- ✅ **No shared cookies** - Each user maintains their own session
- ✅ **Rate limit isolation** - Users don't affect each other's rate limits
- ✅ **Privacy** - User conversations remain separate

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, Gemini!",
    "cookies": {
      "secure1PSID": "your_cookie_here",
      "secure1PSIDTS": "your_cookie_here"
    }
  }'
```

---

### 4. Chat Sessions

#### Start Chat Session

**Request:**
```bash
curl -X POST http://localhost:3000/api/chat/start \
  -H "Content-Type: application/json" \
  -d '{"model": "gemini-2.0-flash-exp"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chatId": "chat_1735123456789_abc123def",
    "model": "gemini-2.0-flash-exp",
    "message": "Chat session started"
  }
}
```

⚠️ **Save the `chatId` for subsequent messages!**

#### Send Chat Message

**Request:**
```json
{
  "chatId": "chat_1735123456789_abc123def",
  "message": "My name is Alice and I love JavaScript"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chatId": "chat_1735123456789_abc123def",
    "text": "Nice to meet you, Alice! JavaScript is a great language...",
    "thoughts": null,
    "candidates": 1
  }
}
```

#### Follow-up Message

**Request:**
```json
{
  "chatId": "chat_1735123456789_abc123def",
  "message": "What is my name?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Your name is Alice!"
  }
}
```

#### Get Active Sessions

```bash
GET http://localhost:3000/api/chat/sessions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeSessions": [
      "chat_1735123456789_abc123def"
    ],
    "count": 1
  }
}
```

#### End Chat Session

```bash
DELETE http://localhost:3000/api/chat/chat_1735123456789_abc123def
```

**Response:**
```json
{
  "success": true,
  "message": "Chat session ended"
}
```

#### Multi-User Chat Sessions (Custom Cookies)

**Start Chat with Custom Cookies:**
```json
POST /api/chat/start
{
  "model": "gemini-2.0-flash-exp",
  "cookies": {
    "secure1PSID": "user_cookie_value",
    "secure1PSIDTS": "user_cookie_value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chatId": "chat_1735123456789_xyz789ghi",
    "model": "gemini-2.0-flash-exp",
    "message": "Chat session started",
    "usingCustomCookies": true
  }
}
```

**Send Messages:**
The chat session maintains the user's custom client, so you only need to provide the `chatId`:
```json
POST /api/chat/message
{
  "chatId": "chat_1735123456789_xyz789ghi",
  "message": "Hello from my custom account!"
}
```

**Important Notes:**
- ✅ Custom cookies are stored per chat session
- ✅ Multiple users can have active chats simultaneously
- ✅ Each user's chat is isolated with their own cookies
- ✅ Temporary clients are automatically cleaned up when chat ends

---

## 📋 Response Structure Reference

### Complete Response Object

```json
{
  "success": true,
  "data": {
    "text": "Main response text",
    "thoughts": "Model's internal reasoning (Pro models only)",
    "images": [],
    "webImages": [],
    "generatedImages": [],
    "fileAttachments": [],
    "codeBlocks": [],
    "codeExecutionResult": null,
    "sources": [],
    "factuality": null,
    "candidates": 1,
    "model": "gemini-2.0-flash-exp"
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Main text response |
| `thoughts` | string/null | Model's reasoning process (Gemini 2.5 Pro) |
| `images` | array | All images (web + generated) |
| `webImages` | array | Images from web search |
| `generatedImages` | array | AI-generated images |
| `fileAttachments` | array | Generated code files |
| `codeBlocks` | array | Code snippets with language |
| `codeExecutionResult` | object/null | Output from code execution |
| `sources` | array | Web citations and sources |
| `factuality` | object/null | Fact-checking rating |
| `candidates` | number | Number of response alternatives |

---

## 🎨 Postman Collection

### Import Collection

1. Open Postman
2. Click **Import**
3. Select `postman_collection.json`
4. All endpoints ready to test!

### Included Requests

- ✅ Health Check
- ✅ Get Available Models
- ✅ Generate Content (with examples)
- ✅ Start Chat Session
- ✅ Send Chat Message
- ✅ Get Active Sessions
- ✅ End Chat Session

### Postman Payload Examples

#### Generate Content Payloads

**Basic Generation:**
```json
{
  "prompt": "Explain quantum computing in simple terms"
}
```

**Code Request:**
```json
{
  "prompt": "Create a REST API endpoint in Express.js for user authentication"
}
```

**With Images:**
```json
{
  "prompt": "Show me pictures of Mount Everest"
}
```

**Image Generation (Pro Model):**
```json
{
  "prompt": "Generate an image of a blue sunflower",
  "model": "gemini-2.5-pro"
}
```

**Data Analysis:**
```json
{
  "prompt": "Analyze this data: Q1: 100k, Q2: 150k, Q3: 200k, Q4: 180k"
}
```

**Multi-User Request (Custom Cookies):**
```json
{
  "prompt": "What is machine learning?",
  "model": "gemini-2.0-flash-exp",
  "cookies": {
    "secure1PSID": "g.a000...",
    "secure1PSIDTS": "sidts-..."
  }
}
```

#### Chat Workflow Example

**Step 1 - Start Chat:**
```json
POST /api/chat/start
{
  "model": "gemini-2.0-flash-exp"
}
```

**Step 2 - First Message:**
```json
POST /api/chat/message
{
  "chatId": "chat_xxx...",
  "message": "I'm planning a trip to Japan. Any recommendations?"
}
```

**Step 3 - Follow-up:**
```json
POST /api/chat/message
{
  "chatId": "chat_xxx...",
  "message": "What about food? What should I try?"
}
```

**Step 4 - End Session:**
```
DELETE /api/chat/chat_xxx...
```

---

## 🌟 Response Examples

### Example 1: Web Images Response

**Request:**
```json
{
  "prompt": "Show me pictures of the Eiffel Tower"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Here are some pictures of the Eiffel Tower:",
    "images": [
      {
        "type": "web_image",
        "url": "https://example.com/eiffel1.jpg",
        "title": "Eiffel Tower at Night",
        "alt": "The Eiffel Tower illuminated at night"
      },
      {
        "type": "web_image",
        "url": "https://example.com/eiffel2.jpg",
        "title": "Eiffel Tower Day View",
        "alt": "Eiffel Tower during daytime"
      }
    ],
    "webImages": [...],
    "generatedImages": []
  }
}
```

### Example 2: Code with Multiple Languages

**Request:**
```json
{
  "prompt": "Show me how to make an HTTP request in Python and JavaScript"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Here's how to make HTTP requests...",
    "codeBlocks": [
      {
        "language": "python",
        "code": "import requests\nresponse = requests.get('https://api.example.com')"
      },
      {
        "language": "javascript",
        "code": "fetch('https://api.example.com')\n  .then(res => res.json())"
      }
    ]
  }
}
```

### Example 3: Response with Sources

**Request:**
```json
{
  "prompt": "What are the latest developments in quantum computing?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Recent developments include error correction improvements...",
    "sources": [
      {
        "title": "IBM Quantum - Latest News",
        "url": "https://www.ibm.com/quantum/news",
        "snippet": "IBM announces breakthrough in quantum error correction..."
      },
      {
        "title": "Google Quantum AI",
        "url": "https://quantumai.google/",
        "snippet": "Google achieves quantum advantage..."
      }
    ],
    "factuality": {
      "rating": "high",
      "confidence": 0.89
    }
  }
}
```

### Example 4: Generated Image

**Request:**
```json
{
  "prompt": "Generate an image of a robot playing guitar",
  "model": "gemini-2.5-pro"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Here's a generated image of a robot playing guitar:",
    "images": [
      {
        "type": "generated_image",
        "url": "http://googleusercontent.com/image_generation_content/12345",
        "title": "Generated Image 1",
        "alt": "A robot playing guitar"
      }
    ],
    "generatedImages": [...]
  }
}
```

---

## ⚙️ Configuration

### Environment Variables

```env
# Optional (for default global client)
SECURE_1PSID=your_secure_1psid_cookie
SECURE_1PSIDTS=your_secure_1psidts_cookie

# Optional
PORT=3000
```

**Note:** Environment cookies are now **optional**. The server can run in multi-user mode where each request provides its own cookies.

### Multi-User Mode

The API supports two modes of operation:

#### 1. Global Client Mode (Single User)
- Set `SECURE_1PSID` and `SECURE_1PSIDTS` in `.env`
- All requests use the same Google account
- Auto-refresh enabled for cookie management

#### 2. Multi-User Mode
- No cookies in `.env` (or optional default cookies)
- Each user provides their own cookies in the request payload
- Supports unlimited concurrent users
- Each user has isolated sessions and rate limits

**Example Multi-User Request:**
```json
{
  "prompt": "Your prompt",
  "cookies": {
    "secure1PSID": "user1_cookie",
    "secure1PSIDTS": "user1_cookie"
  }
}
```

**Hybrid Mode:**
- Set default cookies in `.env`
- Users can optionally override with their own cookies
- Provides fallback for requests without custom cookies

### Client Options

```javascript
await client.init({
  timeout: 300000,        // 5 minutes (300 seconds)
  autoRefresh: true,      // Enable auto cookie refresh
  refreshInterval: 60000, // Refresh every 1 minute
  verbose: true           // Enable logging
});
```

### Available Models

| Model | Speed | Capabilities |
|-------|-------|--------------|
| `gemini-2.0-flash-exp` | Fastest | Default, general use |
| `gemini-2.5-flash-002` | Fast | Advanced features |
| `gemini-2.5-pro-002` | Standard | Thinking process, image generation |

---

## 🔧 Available Scripts

```bash
npm run server        # Start production server
npm run server:dev    # Start with auto-reload (nodemon)
npm test             # Run test file
npm run dev          # Run test with auto-reload
```

---

## 🛡️ Error Responses

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Prompt is required"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Chat session not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Error details here"
}
```

### 503 Service Unavailable
```json
{
  "error": "Service Unavailable",
  "message": "Gemini client not initialized"
}
```

---

## 💡 Integration Examples

### JavaScript/Fetch

```javascript
async function generateContent(prompt) {
  const response = await fetch('http://localhost:3000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  
  const result = await response.json();
  return result.data;
}

// Usage
const data = await generateContent('Hello, Gemini!');
console.log(data.text);
```

### Python/Requests

```python
import requests

def generate_content(prompt):
    response = requests.post('http://localhost:3000/api/generate', 
        json={'prompt': prompt}
    )
    return response.json()['data']

# Usage
data = generate_content('Hello, Gemini!')
print(data['text'])
```

### React Component

```jsx
function GeminiResponse({ data }) {
  return (
    <div className="response">
      <div className="text">{data.text}</div>
      
      {data.thoughts && (
        <div className="thoughts">
          <h4>💭 Model Thinking:</h4>
          <pre>{data.thoughts}</pre>
        </div>
      )}
      
      {data.codeBlocks.map((block, i) => (
        <pre key={i}>
          <code className={`language-${block.language}`}>
            {block.code}
          </code>
        </pre>
      ))}
      
      {data.images.map((img, i) => (
        <img key={i} src={img.url} alt={img.alt} title={img.title} />
      ))}
    </div>
  );
}
```

---

## 📊 Architecture

```
gemini-api/
├── src/
│   ├── client.js       # Gemini API client
│   ├── server.js       # Express REST API server
│   ├── constants.js    # Models & endpoints
│   └── utils.js        # Helper functions
├── postman_collection.json
├── package.json
├── .env
└── README.md
```

---

## 🔒 Security Best Practices

For production deployment:

1. **Authentication** - Add JWT or API key authentication
2. **Rate Limiting** - Prevent API abuse
3. **HTTPS** - Use SSL certificates
4. **Input Validation** - Sanitize all inputs
5. **Logging** - Add request/error logging
6. **CORS** - Configure proper CORS policies

---

## 🐛 Troubleshooting

### Server won't start
- Check port 3000 is available
- Ensure Node.js version 18+
- `.env` file is optional (for multi-user mode)

### 503 Service Unavailable
- If using default client: Cookie values may be incorrect or expired
- If using custom cookies: Check the cookies provided in request payload
- Check internet connection

### No global client available and no cookies provided
- Either set `SECURE_1PSID` in `.env` OR provide cookies in request payload
- For multi-user mode: include `cookies` object in request body

### Chat session not found
- Chat ID is incorrect
- Session expired or server restarted
- Start a new chat session

### Auto-refresh errors
- Normal for temporary user clients (auto-refresh is disabled)
- For default client: Check network connectivity to `accounts.google.com`

---

## 🚀 Deployment

### Deploy to Vercel

This API can be easily deployed to Vercel for serverless hosting:

1. **Quick Deploy:**
   - Push your code to GitHub
   - Import project to Vercel
   - Add environment variables (`SECURE_1PSID`, `SECURE_1PSIDTS`)
   - Deploy!

2. **Detailed Instructions:**
   - See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for complete guide

3. **Using Vercel CLI:**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

**Note:** Vercel serverless functions have execution time limits (10s Hobby, 60s Pro). Chat sessions use in-memory storage and reset on cold starts.

---

## ⚠️ Disclaimer

This is an **unofficial** client created through reverse engineering. Use at your own risk. For official API access, use [Google's Gemini API](https://ai.google.dev/).

---

## 📄 License

MIT License

---

## 🎉 Quick Start Checklist

- [ ] `npm install`
- [ ] Create `.env` with cookies (optional - for default client)
- [ ] `npm run server`
- [ ] Import `postman_collection.json` into Postman
- [ ] Test `/health` endpoint
- [ ] Test `/api/generate` endpoint (with or without custom cookies)
- [ ] Start building!

**Two ways to use:**
1. **Default Mode:** Set cookies in `.env` - all requests use same account
2. **Multi-User Mode:** Provide cookies in each request - support multiple users

---

**Ready to build amazing AI-powered applications!** 🚀✨
#   g e m i n i - w e b - a p i  
 #   g e m i n i - w e b - a p i  
 #   g e m i n i - w e b - a p i  
 #   g e m i n i - w e b - a p i  
 