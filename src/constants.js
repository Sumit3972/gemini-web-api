/**
 * Constants used throughout the Gemini API client
 */

export const Endpoints = {
    GOOGLE: 'https://www.google.com',
    INIT: 'https://gemini.google.com/app',
    GENERATE: 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
    ROTATE_COOKIES: 'https://accounts.google.com/RotateCookies',
    UPLOAD: 'https://content-push.googleapis.com/upload',
    BATCH_EXEC: 'https://gemini.google.com/_/BardChatUi/data/batchexecute'
};

export const Headers = {
    GEMINI: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Host': 'gemini.google.com',
        'Origin': 'https://gemini.google.com',
        'Referer': 'https://gemini.google.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Same-Domain': '1'
    },
    ROTATE_COOKIES: {
        'Content-Type': 'application/json'
    },
    UPLOAD: {
        'Push-ID': 'feeds/mcudyrk2a4khkz'
    }
};

export const Models = {
    UNSPECIFIED: {
        name: 'unspecified',
        header: {}
    },
    GEMINI_2_5_FLASH: {
        name: 'gemini-2.5-flash',
        header: {
            'x-goog-ext-525001261-jspb': '[1,null,null,null,"71c2d248d3b102ff",null,null,0,[4]]'
        }
    },
    GEMINI_2_5_PRO: {
        name: 'gemini-2.5-pro',
        header: {
            'x-goog-ext-525001261-jspb': '[1,null,null,null,"4af6c7f5da75d65d",null,null,0,[4]]'
        }
    },
    GEMINI_2_0_FLASH: {
        name: 'gemini-2.0-flash',
        header: {
            'x-goog-ext-525001261-jspb': '[1,null,null,null,"f299729663a2343f"]'
        }
    }
};

export const ErrorCodes = {
    USAGE_LIMIT_EXCEEDED: 1037,
    MODEL_INCONSISTENT: 1050,
    MODEL_HEADER_INVALID: 1052,
    IP_TEMPORARILY_BLOCKED: 1060
};

