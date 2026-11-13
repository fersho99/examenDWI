export type SourceName = "binance";

export class SourceError extends Error {
  readonly source: SourceName;
  readonly status: number | undefined;
  readonly retryAfterSec: number | undefined;

  constructor(
    source: SourceName,
    message: string,
    options: { status?: number | undefined; retryAfterSec?: number | undefined; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "SourceError";
    this.source = source;
    this.status = options.status;
    this.retryAfterSec = options.retryAfterSec;
  }

  /** Límite de tasa o bloqueo: hay que dejar de llamar a la fuente en este ciclo. */
  get isRateLimited() {
    return this.status === 429 || this.status === 418;
  }
}
