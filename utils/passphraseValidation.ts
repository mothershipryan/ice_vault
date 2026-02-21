// Passphrase strength validation utility

export interface PassphraseStrength {
    valid: boolean;
    score: number; // 0-4
    message: string;
    color: string;
    label: string;
}

export const validatePassphraseStrength = (passphrase: string): PassphraseStrength => {
    let score = 0;
    const messages: string[] = [];

    // Length check
    if (passphrase.length < 16) {
        messages.push("At least 16 characters");
    } else {
        score++;
    }

    // Uppercase check
    if (!/[A-Z]/.test(passphrase)) {
        messages.push("One uppercase letter");
    } else {
        score++;
    }

    // Lowercase check
    if (!/[a-z]/.test(passphrase)) {
        messages.push("One lowercase letter");
    } else {
        score++;
    }

    // Number check
    if (!/[0-9]/.test(passphrase)) {
        messages.push("One number");
    } else {
        score++;
    }

    // Special character check
    if (!/[^A-Za-z0-9]/.test(passphrase)) {
        messages.push("One special character");
    } else {
        score++;
    }

    // Determine strength
    let label = '';
    let color = '';
    let valid = false;

    if (score === 0) {
        label = 'Very Weak';
        color = 'bg-red-500';
    } else if (score === 1) {
        label = 'Weak';
        color = 'bg-red-400';
    } else if (score === 2) {
        label = 'Fair';
        color = 'bg-orange-400';
    } else if (score === 3) {
        label = 'Good';
        color = 'bg-yellow-400';
    } else if (score === 4) {
        label = 'Strong';
        color = 'bg-green-400';
    } else if (score === 5) {
        label = 'Very Strong';
        color = 'bg-green-500';
        valid = true;
    }

    const message = messages.length > 0
        ? `Missing: ${messages.join(', ')}`
        : 'Strong passphrase';

    return { valid, score, message, color, label };
};
