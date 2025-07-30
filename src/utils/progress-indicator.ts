/**
 * Progress indicator utility that respects stdout piping/redirection
 * Only shows progress when output is going to an interactive terminal
 */

export interface ProgressOptions {
  total: number;
  label?: string;
  showPercentage?: boolean;
  showETA?: boolean;
  width?: number;
}

export class ProgressIndicator {
  private current = 0;
  private total: number;
  private label: string;
  private showPercentage: boolean;
  private showETA: boolean;
  private width: number;
  private startTime: number;
  private isEnabled: boolean;

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.label = options.label || 'Progress';
    this.showPercentage = options.showPercentage ?? true;
    this.showETA = options.showETA ?? true;
    this.width = options.width || 40;
    this.startTime = Date.now();
    
    // Only enable progress indicator if:
    // 1. stdout is a TTY (interactive terminal)
    // 2. Not being piped or redirected
    this.isEnabled = process.stdout.isTTY === true;
  }

  /**
   * Update progress and redraw if enabled
   */
  update(increment: number = 1): void {
    if (!this.isEnabled) return;

    this.current += increment;
    this.draw();
  }

  /**
   * Update the step label and redraw
   */
  updateStep(stepName: string, increment: number = 1): void {
    if (!this.isEnabled) return;

    this.label = stepName;
    this.current += increment;
    this.draw();
  }

  /**
   * Set absolute progress value
   */
  set(value: number): void {
    if (!this.isEnabled) return;

    this.current = Math.min(value, this.total);
    this.draw();
  }

  /**
   * Complete the progress bar
   */
  complete(): void {
    if (!this.isEnabled) return;

    this.current = this.total;
    this.draw();
    process.stdout.write('\n'); // Move to next line when complete
  }

  /**
   * Clear the progress bar without completing
   */
  clear(): void {
    if (!this.isEnabled) return;

    // Clear the current line
    process.stdout.write('\r\x1b[K');
  }

  /**
   * Draw the progress bar
   */
  private draw(): void {
    if (!this.isEnabled) return;

    const percentage = Math.min(100, (this.current / this.total) * 100);
    const filled = Math.floor((percentage / 100) * this.width);
    const empty = this.width - filled;

    // Build progress bar
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    let line = `${this.label}: [${bar}]`;

    // Add percentage if enabled
    if (this.showPercentage) {
      line += ` ${percentage.toFixed(1)}%`;
    }

    // Add current/total count
    line += ` (${this.current}/${this.total})`;

    // Add ETA if enabled and we have some progress
    if (this.showETA && this.current > 0) {
      const elapsed = Date.now() - this.startTime;
      const rate = this.current / elapsed; // items per ms
      const remaining = this.total - this.current;
      const eta = remaining / rate; // ms remaining

      if (eta > 0 && eta < Infinity) {
        line += ` ETA: ${this.formatTime(eta)}`;
      }
    }

    // Clear the current line and write the new progress
    // \r moves to start of line, \x1b[K clears from cursor to end of line
    process.stdout.write(`\r\x1b[K${line}`);
  }

  /**
   * Format time in ms to human readable format
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Check if progress indicator is enabled (useful for conditional logic)
   */
  isProgressEnabled(): boolean {
    return this.isEnabled;
  }
}

/**
 * Simple progress indicator for single operations
 */
export class SimpleProgress {
  private spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private isEnabled: boolean;
  private message: string;

  constructor(message: string = 'Processing...') {
    this.message = message;
    this.isEnabled = process.stdout.isTTY === true;
  }

  /**
   * Start the spinner
   */
  start(): void {
    if (!this.isEnabled) return;

    this.intervalId = setInterval(() => {
      const frame = this.spinner[this.currentFrame];
      process.stdout.write(`\r\x1b[K${frame} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.spinner.length;
    }, 100);
  }

  /**
   * Update the message while spinning
   */
  updateMessage(message: string): void {
    this.message = message;
  }

  /**
   * Stop the spinner and optionally show a completion message
   */
  stop(completionMessage?: string): void {
    if (!this.isEnabled) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Clear the spinner line
    process.stdout.write('\r\x1b[K');

    // Show completion message if provided
    if (completionMessage) {
      process.stdout.write(`${completionMessage}\n`);
    }
  }
}

/**
 * Utility function to check if we should show progress indicators
 */
export function shouldShowProgress(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Utility function to create a progress indicator only if appropriate
 */
export function createProgressIndicator(options: ProgressOptions): ProgressIndicator | null {
  return shouldShowProgress() ? new ProgressIndicator(options) : null;
}

/**
 * Utility function to create a simple spinner only if appropriate
 */
export function createSimpleProgress(message: string): SimpleProgress | null {
  return shouldShowProgress() ? new SimpleProgress(message) : null;
}