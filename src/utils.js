/**
 * Utility functions for the Gemini API client
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Endpoints, Headers } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use /tmp for serverless environments (Vercel, AWS Lambda), otherwise use local temp
const getTempDir = () => {
    // Check if running in serverless environment
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT;
    return isServerless ? '/tmp' : path.join(__dirname, 'temp');
};

/**
 * Rotate/refresh the __Secure-1PSIDTS cookie
 * This prevents cookie expiration by refreshing it periodically
 * 
 * @param {Object} cookies - Current cookies object
 * @param {string|null} proxy - Optional proxy URL
 * @returns {Promise<string|null>} New __Secure-1PSIDTS value or null
 */
export async function rotate1PSIDTS(cookies, proxy = null) {
    const cacheDir = getTempDir();

    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    const filename = `.cached_1psidts_${cookies['__Secure-1PSID']}.txt`;
    const cachePath = path.join(cacheDir, filename);

    // Check if cache file was modified in the last 60 seconds to avoid 429 Too Many Requests
    if (fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        const now = Date.now();
        const modifiedTime = stats.mtimeMs;

        if (now - modifiedTime <= 60000) { // 60 seconds
            console.log('[Cookie Refresh] Cache file recently updated, skipping refresh');
            return null;
        }
    }

    try {
        const config = {
            method: 'post',
            url: Endpoints.ROTATE_COOKIES,
            headers: {
                ...Headers.ROTATE_COOKIES,
                'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
            },
            data: '[000,"-0000000000000000000"]',
            maxRedirects: 5,
            validateStatus: (status) => status < 500 // Don't throw on 4xx errors
        };

        if (proxy) {
            config.proxy = parseProxyUrl(proxy);
        }

        const response = await axios(config);

        if (response.status === 401) {
            throw new Error('Authentication failed - cookies may be invalid');
        }

        // Extract new __Secure-1PSIDTS from Set-Cookie headers
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
            for (const cookie of setCookieHeader) {
                if (cookie.includes('__Secure-1PSIDTS=')) {
                    const match = cookie.match(/__Secure-1PSIDTS=([^;]+)/);
                    if (match && match[1]) {
                        const new1PSIDTS = match[1];
                        // Cache the new value
                        fs.writeFileSync(cachePath, new1PSIDTS, 'utf8');
                        console.log('[Cookie Refresh] Successfully refreshed __Secure-1PSIDTS');
                        return new1PSIDTS;
                    }
                }
            }
        }

        return null;
    } catch (error) {
        if (error.response?.status === 401) {
            throw new Error('Authentication failed during cookie rotation');
        }
        console.error('[Cookie Refresh] Error rotating cookies:', error.message);
        throw error;
    }
}

/**
 * Get access token (SNlM0e) from Gemini webpage
 * 
 * @param {Object} cookies - Cookies object
 * @param {string|null} proxy - Optional proxy URL
 * @returns {Promise<{accessToken: string, cookies: Object}>}
 */
export async function getAccessToken(cookies, proxy = null) {
    // Try loading from cache first
    const cacheDir = getTempDir();
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Check for cached __Secure-1PSIDTS if not provided
    if (cookies['__Secure-1PSID'] && !cookies['__Secure-1PSIDTS']) {
        const filename = `.cached_1psidts_${cookies['__Secure-1PSID']}.txt`;
        const cachePath = path.join(cacheDir, filename);

        if (fs.existsSync(cachePath)) {
            const cached1PSIDTS = fs.readFileSync(cachePath, 'utf8').trim();
            if (cached1PSIDTS) {
                cookies['__Secure-1PSIDTS'] = cached1PSIDTS;
                console.log('[Init] Loaded cached __Secure-1PSIDTS');
            }
        }
    }

    try {
        // First, get additional cookies from google.com
        const googleResponse = await axios.get(Endpoints.GOOGLE, {
            maxRedirects: 5,
            proxy: proxy ? parseProxyUrl(proxy) : undefined
        });

        const extraCookies = parseCookiesFromResponse(googleResponse);

        // Now request the Gemini init page
        const config = {
            method: 'get',
            url: Endpoints.INIT,
            headers: {
                ...Headers.GEMINI,
                'Cookie': Object.entries({ ...extraCookies, ...cookies })
                    .map(([k, v]) => `${k}=${v}`)
                    .join('; ')
            },
            maxRedirects: 5,
            validateStatus: (status) => status < 500
        };

        if (proxy) {
            config.proxy = parseProxyUrl(proxy);
        }

        const response = await axios(config);

        if (response.status !== 200) {
            throw new Error(`Failed to fetch access token. Status: ${response.status}`);
        }

        // Extract SNlM0e token from response
        const match = response.data.match(/"SNlM0e":"(.*?)"/);
        if (!match || !match[1]) {
            throw new Error('Failed to extract access token from response. Cookies may be invalid.');
        }

        const accessToken = match[1];
        const validCookies = { ...extraCookies, ...cookies };

        console.log('[Init] Successfully obtained access token');
        return { accessToken, cookies: validCookies };
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            throw new Error('Authentication failed. Please check your cookies.');
        }
        throw error;
    }
}

/**
 * Parse cookies from axios response
 */
function parseCookiesFromResponse(response) {
    const cookies = {};
    const setCookieHeader = response.headers['set-cookie'];

    if (setCookieHeader) {
        for (const cookie of setCookieHeader) {
            const match = cookie.match(/([^=]+)=([^;]+)/);
            if (match) {
                cookies[match[1]] = match[2];
            }
        }
    }

    return cookies;
}

/**
 * Parse proxy URL string into axios proxy config
 */
function parseProxyUrl(proxyUrl) {
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

/**
 * Sleep utility
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

