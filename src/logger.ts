class Logger {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  log(...messages: any[]): void {
    console.log(`[${this.namespace}]`, ...messages);
  }

  debug(...messages: any[]): void {
    console.debug(`[${this.namespace}]`, ...messages);
  }

  info(...messages: any[]): void {
    console.info(`[${this.namespace}]`, ...messages);
  }

  warn(...messages: any[]): void {
    console.warn(`[${this.namespace}]`, ...messages);
  }

  error(...messages: any[]): void {
    console.error(`[${this.namespace}]`, ...messages);
  }
}

export default new Logger("read-trail");
