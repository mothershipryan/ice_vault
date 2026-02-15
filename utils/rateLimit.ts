// Rate limiting utility for preventing brute force attacks

interface RateLimitData {
    attempts: number;
    lastAttempt: number;
    blockedUntil?: number;
}

const RATE_LIMIT_KEY = 'vault_rate_limit';
const MAX_ATTEMPTS = 10;
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const RESET_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const checkRateLimit = (): { allowed: boolean; message?: string } => {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_KEY);
        const data: RateLimitData = stored ? JSON.parse(stored) : { attempts: 0, lastAttempt: 0 };
        const now = Date.now();

        // Check if currently blocked
        if (data.blockedUntil && now < data.blockedUntil) {
            const minutesLeft = Math.ceil((data.blockedUntil - now) / 60000);
            return {
                allowed: false,
                message: `Too many failed attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`
            };
        }

        // Reset if last attempt was over 1 hour ago
        if (now - data.lastAttempt > RESET_WINDOW_MS) {
            localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ attempts: 0, lastAttempt: now }));
        }

        return { allowed: true };
    } catch (error) {
        console.error('[RateLimit] Error checking rate limit:', error);
        return { allowed: true }; // Fail open
    }
};

export const recordFailedAttempt = (): void => {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_KEY);
        const data: RateLimitData = stored ? JSON.parse(stored) : { attempts: 0, lastAttempt: 0 };
        const now = Date.now();

        // Reset if last attempt was over 1 hour ago
        if (now - data.lastAttempt > RESET_WINDOW_MS) {
            data.attempts = 1;
        } else {
            data.attempts = (data.attempts || 0) + 1;
        }

        data.lastAttempt = now;

        // Block after MAX_ATTEMPTS
        if (data.attempts >= MAX_ATTEMPTS) {
            data.blockedUntil = now + BLOCK_DURATION_MS;
            console.warn(`[RateLimit] Blocked after ${MAX_ATTEMPTS} failed attempts`);
        }

        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('[RateLimit] Error recording failed attempt:', error);
    }
};

export const resetRateLimit = (): void => {
    try {
        localStorage.removeItem(RATE_LIMIT_KEY);
    } catch (error) {
        console.error('[RateLimit] Error resetting rate limit:', error);
    }
};
