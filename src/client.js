/**
 * Gemini Web API Client for Node.js
 * Reverse-engineered API with automatic cookie refresh
 */

import axios from 'axios';
import { Endpoints, Headers, Models, ErrorCodes } from './constants.js';
import { rotate1PSIDTS, getAccessToken, sleep } from './utils.js';

/**
 * Main Gemini API Client
 */
export class GeminiClient {
    constructor(secure1PSID = null, secure1PSIDTS = null, proxy = null) {
        this.cookies = {};
        this.proxy = proxy;
        this.running = false;
        this.accessToken = null;
        this.timeout = 300000; // 300 seconds
        this.autoRefresh = true;
        this.refreshInterval = 54000; // 54 seconds (9 minutes)
        this.refreshIntervalId = null;

        if (secure1PSID) {
            this.cookies['__Secure-1PSID'] = secure1PSID;
            if (secure1PSIDTS) {
                this.cookies['__Secure-1PSIDTS'] = secure1PSIDTS;
            }
        }
    }

    /**
     * Initialize the client - fetch access token and start auto-refresh
     * 
     * @param {Object} options - Configuration options
     * @param {number} options.timeout - Request timeout in milliseconds
     * @param {boolean} options.autoRefresh - Enable automatic cookie refresh
     * @param {number} options.refreshInterval - Cookie refresh interval in milliseconds
     * @param {boolean} options.verbose - Enable verbose logging
     */
    async init(options = {}) {
        const {
            timeout = 300000,
            autoRefresh = true,
            refreshInterval = 540000,
            verbose = true
        } = options;

        this.timeout = timeout;
        this.autoRefresh = autoRefresh;
        this.refreshInterval = refreshInterval;
        this.verbose = verbose;

        try {
            if (this.verbose) {
                console.log('[Init] Initializing Gemini client...');
            }

            // Get access token and valid cookies
            const { accessToken, cookies } = await getAccessToken(this.cookies, this.proxy);

            this.accessToken = accessToken;
            this.cookies = cookies;
            this.running = true;

            // Start auto-refresh if enabled
            if (this.autoRefresh) {
                this.startAutoRefresh();
            }

            if (this.verbose) {
                console.log('[Init] ✓ Gemini client initialized successfully');
                console.log(`[Init] Auto-refresh: ${this.autoRefresh ? 'enabled' : 'disabled'}`);
                if (this.autoRefresh) {
                    console.log(`[Init] Refresh interval: ${this.refreshInterval / 1000} seconds`);
                }
            }
        } catch (error) {
            await this.close();
            throw new Error(`Failed to initialize client: ${error.message}`);
        }
    }

    /**
     * Start background task to automatically refresh cookies
     */
    startAutoRefresh() {
        // Clear any existing interval
        if (this.refreshIntervalId) {
            clearInterval(this.refreshIntervalId);
        }

        // Create new refresh interval
        this.refreshIntervalId = setInterval(async () => {
            try {
                if (this.verbose) {
                    console.log('[Auto-Refresh] Refreshing cookies...');
                }

                const new1PSIDTS = await rotate1PSIDTS(this.cookies, this.proxy);

                if (new1PSIDTS) {
                    this.cookies['__Secure-1PSIDTS'] = new1PSIDTS;
                    if (this.verbose) {
                        console.log('[Auto-Refresh] ✓ Cookies refreshed successfully');
                    }
                }
            } catch (error) {
                console.error('[Auto-Refresh] Failed to refresh cookies:', error.message);
                console.error('[Auto-Refresh] Background auto-refresh will continue trying...');
            }
        }, this.refreshInterval);

        if (this.verbose) {
            console.log('[Auto-Refresh] Background refresh task started');
        }
    }

    /**
     * Stop auto-refresh and close the client
     */
    async close() {
        this.running = false;

        if (this.refreshIntervalId) {
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
            if (this.verbose) {
                console.log('[Close] Auto-refresh stopped');
            }
        }
    }

    /**
     * Generate content with Gemini
     * 
     * @param {string} prompt - User prompt
     * @param {Object} options - Generation options
     * @param {Object} options.model - Model to use (from Models constants)
     * @param {Object} options.chat - ChatSession instance for conversation
     * @returns {Promise<Object>} Model output
     */
    async generateContent(prompt, options = {}) {
        if (!prompt || prompt.trim() === '') {
            throw new Error('Prompt cannot be empty');
        }

        if (!this.running) {
            throw new Error('Client not initialized. Call init() first.');
        }

        const { model = Models.UNSPECIFIED, chat = null } = options;

        try {
            // Prepare request data
            const requestData = [
                null,
                JSON.stringify([
                    [prompt],
                    null,
                    chat ? chat.metadata : null
                ])
            ];

            const formData = new URLSearchParams();
            formData.append('at', this.accessToken);
            formData.append('f.req', JSON.stringify(requestData));

            const config = {
                method: 'post',
                url: Endpoints.GENERATE,
                headers: {
                    ...Headers.GEMINI,
                    ...model.header,
                    'Cookie': Object.entries(this.cookies)
                        .map(([k, v]) => `${k}=${v}`)
                        .join('; ')
                },
                data: formData.toString(),
                timeout: this.timeout,
                maxRedirects: 5
            };

            if (this.proxy) {
                config.proxy = this.parseProxyUrl(this.proxy);
            }

            const response = await axios(config);

            if (response.status !== 200) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            // Parse response
            const output = this.parseResponse(response.data);

            // Update chat metadata if chat session provided
            if (chat) {
                chat.lastOutput = output;
                chat.metadata = output.metadata;
                chat.rcid = output.rcid;
            }

            return output;
        } catch (error) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                throw new Error('Request timed out. Consider increasing timeout value.');
            }

            if (error.response?.status === 401 || error.response?.status === 403) {
                await this.close();
                throw new Error('Authentication failed. Cookies may have expired. Please reinitialize.');
            }

            throw error;
        }
    }

    /**
     * Detect MIME type from file extension
     */
    detectMimeType(fileName) {
        if (!fileName) return 'text/plain';
        
        const ext = fileName.split('.').pop().toLowerCase();
        const mimeTypes = {
            // Programming languages
            'js': 'text/javascript',
            'ts': 'text/typescript',
            'py': 'text/x-python',
            'cpp': 'text/x-c++',
            'c': 'text/x-c',
            'h': 'text/x-c',
            'hpp': 'text/x-c++',
            'java': 'text/x-java',
            'cs': 'text/x-csharp',
            'php': 'text/x-php',
            'rb': 'text/x-ruby',
            'go': 'text/x-go',
            'rs': 'text/x-rust',
            'swift': 'text/x-swift',
            'kt': 'text/x-kotlin',
            // Web
            'html': 'text/html',
            'css': 'text/css',
            'json': 'application/json',
            'xml': 'application/xml',
            // Shell
            'sh': 'application/x-sh',
            'bash': 'application/x-sh',
            // Text
            'txt': 'text/plain',
            'md': 'text/markdown',
            // Other
            'sql': 'application/sql',
            'yaml': 'text/yaml',
            'yml': 'text/yaml'
        };
        
        return mimeTypes[ext] || 'text/plain';
    }

    /**
     * Parse Gemini API response data
     * Extracts all content types: text, images, code, files, sources, etc.
     * 
     * @param {string} responseText - Raw response from Gemini API
     * @returns {Object} Parsed response with candidates and content
     */
    parseResponse(responseText) {
        try {
            const lines = responseText.split('\n');
            if (lines.length < 3) {
                throw new Error('Invalid response format');
            }

            const responseJson = JSON.parse(lines[2]);

            // Locate the main response body containing candidates
            let body = null;
            let bodyIndex = 0;
            for (let i = 0; i < responseJson.length; i++) {
                try {
                    const mainPart = JSON.parse(responseJson[i][2]);
                    if (mainPart[4]) {
                        body = mainPart;
                        bodyIndex = i;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!body) {
                throw new Error('No valid response body found');
            }

            // Parse all response candidates
            const candidates = [];
            for (let candidateIndex = 0; candidateIndex < body[4].length; candidateIndex++) {
                const candidate = body[4][candidateIndex];
                let text = candidate[1][0];

                // Handle special card content (replace URL with actual text)
                if (text && text.match(/^http:\/\/googleusercontent\.com\/card_content\/\d+/)) {
                    text = (candidate[22] && candidate[22][0]) || text;
                }

                // Extract thoughts (for thinking models)
                let thoughts = null;
                try {
                    if (candidate[37] && candidate[37][0]) {
                        thoughts = candidate[37][0][0];
                    }
                } catch (e) {
                    // No thoughts available
                }

                /**
                 * Extract file attachments (code files, documents, etc.)
                 * Gemini includes generated files in candidate[30] array
                 * Structure: [fileName, fileId, title, null, content]
                 */
                const fileAttachments = [];
                try {
                    const immersiveChipRegex = /http:\/\/googleusercontent\.com\/immersive_entry_chip\/(\d+)/g;
                    const chipMatches = text.match(immersiveChipRegex);
                    
                    // Extract from candidate[30] (primary location for generated files)
                    if (candidate[30] && Array.isArray(candidate[30])) {
                        for (const file of candidate[30]) {
                            if (file && Array.isArray(file) && file.length >= 5) {
                                fileAttachments.push({
                                    fileName: file[0] || 'file.txt',
                                    mimeType: this.detectMimeType(file[0]),
                                    url: chipMatches ? chipMatches[0] : null,
                                    title: file[2] || null,
                                    content: file[4] || null
                                });
                            }
                        }
                    }
                } catch (e) {
                    // Silent fail - file attachments are optional
                }

                /**
                 * Extract code blocks
                 * Primary: From structured data in candidate[14]
                 * Fallback: Parse markdown code blocks from text
                 */
                const codeBlocks = [];
                try {
                    if (candidate[14] && Array.isArray(candidate[14])) {
                        for (const code of candidate[14]) {
                            if (code && code[1]) {
                                codeBlocks.push({
                                    language: code[0] || 'text',
                                    code: code[1]
                                });
                            }
                        }
                    }
                    
                    // Fallback: Extract from markdown syntax in text
                    if (codeBlocks.length === 0 && text) {
                        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
                        let match;
                        while ((match = codeBlockRegex.exec(text)) !== null) {
                            codeBlocks.push({
                                language: match[1] || 'text',
                                code: match[2].trim()
                            });
                        }
                    }
                } catch (e) {
                    // Code blocks are optional
                }

                /**
                 * Extract code execution results (if Gemini ran code)
                 * Structure: [output, error]
                 */
                let codeExecutionResult = null;
                try {
                    if (candidate[16] && candidate[16][0]) {
                        codeExecutionResult = {
                            output: candidate[16][0],
                            error: candidate[16][1] || null
                        };
                    }
                } catch (e) {
                    // Execution results are optional
                }

                /**
                 * Extract factuality rating and web sources
                 * Factuality: candidate[45] - [rating, confidence]
                 * Sources: candidate[11] - Array of [title, url, snippet]
                 */
                let factuality = null;
                const sources = [];
                try {
                    if (candidate[45]) {
                        factuality = {
                            rating: candidate[45][0] || null,
                            confidence: candidate[45][1] || null
                        };
                    }
                    if (candidate[11] && Array.isArray(candidate[11])) {
                        for (const source of candidate[11]) {
                            if (source && source[0]) {
                                sources.push({
                                    title: source[0][0] || '',
                                    url: source[0][1] || '',
                                    snippet: source[0][2] || ''
                                });
                            }
                        }
                    }
                } catch (e) {
                    // Factuality and sources are optional
                }

                /**
                 * Extract web images (from search results)
                 * Location: candidate[12][1]
                 */
                const webImages = [];
                if (candidate[12] && candidate[12][1]) {
                    for (const webImage of candidate[12][1]) {
                        webImages.push({
                            type: 'web_image',
                            url: webImage[0][0][0],
                            title: webImage[7][0],
                            alt: webImage[0][4]
                        });
                    }
                }

                /**
                 * Extract AI-generated images
                 * Location: candidate[12][7][0]
                 */
                const generatedImages = [];
                if (candidate[12] && candidate[12][7] && candidate[12][7][0]) {
                    for (const genImage of candidate[12][7][0]) {
                        try {
                            generatedImages.push({
                                type: 'generated_image',
                                url: genImage[0][3][3],
                                title: genImage[3] && genImage[3][6] ? `Generated Image ${genImage[3][6]}` : 'Generated Image',
                                alt: genImage[3] && genImage[3][5] && genImage[3][5][0] ? genImage[3][5][0] : ''
                            });
                        } catch (e) {
                            // Skip malformed images
                        }
                    }
                }

                // Combine all images into single array
                const allImages = [...webImages, ...generatedImages];

                candidates.push({
                    rcid: candidate[0],
                    text: text,
                    thoughts: thoughts,
                    webImages: webImages,
                    generatedImages: generatedImages,
                    images: allImages,
                    fileAttachments: fileAttachments,
                    codeBlocks: codeBlocks,
                    codeExecutionResult: codeExecutionResult,
                    factuality: factuality,
                    sources: sources
                });
            }

            if (candidates.length === 0) {
                throw new Error('No candidates found in response');
            }

            // Return parsed response with all content types
            return {
                metadata: body[1],
                candidates: candidates,
                // Default response (first candidate)
                text: candidates[0].text,
                thoughts: candidates[0].thoughts,
                images: candidates[0].images,
                webImages: candidates[0].webImages,
                generatedImages: candidates[0].generatedImages,
                fileAttachments: candidates[0].fileAttachments,
                codeBlocks: candidates[0].codeBlocks,
                codeExecutionResult: candidates[0].codeExecutionResult,
                factuality: candidates[0].factuality,
                sources: candidates[0].sources,
                rcid: candidates[0].rcid
            };
        } catch (error) {
            throw new Error(`Failed to parse response: ${error.message}`);
        }
    }

    /**
     * Start a new chat session
     */
    startChat(options = {}) {
        return new ChatSession(this, options);
    }

    /**
     * Parse proxy URL
     */
    parseProxyUrl(proxyUrl) {
        const url = new URL(proxyUrl);
        return {
            protocol: url.protocol.replace(':', ''),
            host: url.hostname,
            port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
            auth: url.username && url.password ? {
                username: url.username,
                password: url.password
            } : undefined
        };
    }
}

/**
 * Chat Session for maintaining conversation context
 */
export class ChatSession {
    constructor(geminiClient, options = {}) {
        this.geminiClient = geminiClient;
        this.metadata = [null, null, null]; // [cid, rid, rcid]
        this.lastOutput = null;
        this.model = options.model || Models.UNSPECIFIED;

        // Initialize metadata if provided
        if (options.metadata) {
            this.setMetadata(options.metadata);
        }
        if (options.cid) this.cid = options.cid;
        if (options.rid) this.rid = options.rid;
        if (options.rcid) this.rcid = options.rcid;
    }

    /**
     * Send a message in this chat session
     */
    async sendMessage(prompt, options = {}) {
        return await this.geminiClient.generateContent(prompt, {
            ...options,
            model: this.model,
            chat: this
        });
    }

    /**
     * Choose a specific candidate from last output
     */
    chooseCandidate(index) {
        if (!this.lastOutput) {
            throw new Error('No previous output in this chat session');
        }

        if (index >= this.lastOutput.candidates.length) {
            throw new Error(`Index ${index} exceeds number of candidates`);
        }

        const chosen = this.lastOutput.candidates[index];
        this.rcid = chosen.rcid;

        return {
            ...this.lastOutput,
            text: chosen.text,
            thoughts: chosen.thoughts,
            images: chosen.images,
            webImages: chosen.webImages,
            generatedImages: chosen.generatedImages,
            fileAttachments: chosen.fileAttachments,
            codeBlocks: chosen.codeBlocks,
            codeExecutionResult: chosen.codeExecutionResult,
            factuality: chosen.factuality,
            sources: chosen.sources,
            rcid: chosen.rcid
        };
    }

    setMetadata(metadata) {
        if (metadata.length > 3) {
            throw new Error('Metadata cannot exceed 3 elements');
        }
        for (let i = 0; i < metadata.length; i++) {
            this.metadata[i] = metadata[i];
        }
    }

    get cid() {
        return this.metadata[0];
    }

    set cid(value) {
        this.metadata[0] = value;
    }

    get rid() {
        return this.metadata[1];
    }

    set rid(value) {
        this.metadata[1] = value;
    }

    get rcid() {
        return this.metadata[2];
    }

    set rcid(value) {
        this.metadata[2] = value;
    }

    toString() {
        return `ChatSession(cid='${this.cid}', rid='${this.rid}', rcid='${this.rcid}')`;
    }
}

export default GeminiClient;

