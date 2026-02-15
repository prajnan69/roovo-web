/**
 * Capture user's IP address for legal compliance tracking
 */

export const captureIpAddress = async (): Promise<string> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Failed to capture IP address:', error);
        return '0.0.0.0';
    }
};

/**
 * Get current timestamp in ISO format
 */
export const getCurrentTimestamp = (): string => {
    return new Date().toISOString();
};
