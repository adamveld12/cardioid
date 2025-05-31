import * as os from "os";
import * as path from "path";
import * as fs from "fs";

// Environment variable constants
const ENV_MAX_LENGTH = "CARDIOID_MAX_LENGTH";
const ENV_OUTPUT_DIRECTORY = "CARDIOID_OUTPUT_DIRECTORY";

// Default values
const DEFAULT_MAX_LENGTH = "1h30m"; // 1 hour and 30 minutes
const DEFAULT_OUTPUT_DIRECTORY = os.tmpdir();

/**
 * Parse time string to seconds
 * Supports formats like "1h30m", "90m", "5400s"
 */
export function parseTimeToSeconds(timeStr: string): number {
  // Match hours, minutes, seconds
  const hoursMatch = timeStr.match(/(\d+)h/);
  const minutesMatch = timeStr.match(/(\d+)m/);
  const secondsMatch = timeStr.match(/(\d+)s/);

  let totalSeconds = 0;

  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  }

  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  }

  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1], 10);
  }

  // If no valid time format was found, try to parse the entire string as seconds
  if (totalSeconds === 0 && /^\d+$/.test(timeStr)) {
    totalSeconds = parseInt(timeStr, 10);
  }

  return totalSeconds;
}

/**
 * Configuration class to manage environment variables
 */
export class EnvironmentConfig {
  /**
   * Get the maximum recording length in seconds
   */
  public static getMaxRecordingLength(): number {
    const maxLengthStr = process.env[ENV_MAX_LENGTH] || DEFAULT_MAX_LENGTH;
    return parseTimeToSeconds(maxLengthStr);
  }

  /**
   * Get the output directory for WAV files
   */
  public static getOutputDirectory(): string {
    const outputDir =
      process.env[ENV_OUTPUT_DIRECTORY] || DEFAULT_OUTPUT_DIRECTORY;
    return path.resolve(outputDir);
  }

  /**
   * Check if running in development mode
   */
  public static isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
  }

  /**
   * Validate all environment variables and throw errors for invalid values
   */
  public static validateEnvironment(): void {
    // Validate max length
    const maxLengthStr = process.env[ENV_MAX_LENGTH] || DEFAULT_MAX_LENGTH;
    const maxLength = parseTimeToSeconds(maxLengthStr);
    if (maxLength <= 0) {
      throw new Error(
        `Invalid ${ENV_MAX_LENGTH}: "${maxLengthStr}". Must be a valid time format (e.g., "1h30m", "90m", "5400s").`
      );
    }

    // Validate output directory
    const outputDir = this.getOutputDirectory();
    try {
      // Check if directory is accessible
      fs.accessSync(outputDir);
    } catch (err) {
      throw new Error(
        `Invalid ${ENV_OUTPUT_DIRECTORY}: "${outputDir}". Directory does not exist or is not accessible.`
      );
    }
  }
}

export default EnvironmentConfig;
