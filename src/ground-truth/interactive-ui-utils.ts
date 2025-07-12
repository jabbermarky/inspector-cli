export function displayMessage(msg: string): void {
    console.log(msg);
}

export function getConfidenceIndicator(confidence: number): string {
    if (confidence >= 0.8) return '🟢';
    if (confidence >= 0.6) return '🟡';
    return '🔴';
}

