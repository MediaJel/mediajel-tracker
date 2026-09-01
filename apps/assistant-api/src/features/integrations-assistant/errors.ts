import { HttpException } from "@nestjs/common";

/**
 * One error type for everything this module turns into an HTTP status + JSON body.
 *
 * It extends `HttpException` so Nest's own filter renders it without a custom filter having to
 * travel with the module — which matters, because the destination service
 * (amplication-nestjs-microservices) already installs its own `HttpExceptionFilter` globally
 * and a second one would be a merge conflict rather than a feature.
 *
 * Every message here is written to be read by an operator mid-job, not by whoever is reading
 * logs afterwards: it says what happened and what to do about it, and it never names a
 * credential the operator holds, because they hold none.
 */
export class ApiError extends HttpException {
  constructor(
    status: number,
    public readonly code: string,
    message: string,
  ) {
    super({ error: { code, message } }, status);
    // `HttpException` derives its own `message` from the response object and would otherwise
    // report "Http Exception" here. The body shape is what the extension parses; `message` is
    // what every log line and every `catch` in this service reads. Both have to carry the text.
    this.message = message;
    this.name = "ApiError";
  }
}
