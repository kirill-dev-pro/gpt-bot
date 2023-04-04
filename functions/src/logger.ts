import { Logger, LogLevel } from '@slack/bolt'
import { logger } from 'firebase-functions/v1'

export class CloudLogger implements Logger {
  /** Setting for level */
  private level
  /** Map of labels for each log level */
  // private static labels
  constructor(level: LogLevel) {
    this.level = level
  }

  debug(...msg: any[]): void {
    if (this.level !== LogLevel.DEBUG) return
    logger.debug(...msg)
  }

  info(...msg: any[]): void {
    if (this.level === LogLevel.DEBUG || this.level === LogLevel.INFO) {
      logger.info(...msg)
    }
  }

  warn(...msg: any[]): void {
    if (this.level !== LogLevel.ERROR) {
      logger.warn(...msg)
    }
  }

  error(...msg: any[]): void {
    logger.error(...msg)
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  getLevel(): LogLevel {
    return this.level
  }

  setName(name: string): void {}
}
