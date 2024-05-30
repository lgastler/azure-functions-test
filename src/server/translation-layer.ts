import { readableStreamToString } from "@remix-run/node";
import { HttpRequest } from "@azure/functions";
import { isBinaryType } from "./is-binary-type";

/**
 * Checks if the incoming request is a GET or HEAD request.
 * @param request Azure HTTP request.
 * @returns `true` if the request is a GET or HEAD request. Otherwise, `false`.
 */
const isGetOrHead = (request: HttpRequest) =>
  request.method === "GET" || request.method === "HEAD";

/**
 * Parses the incoming request to a URL object.
 * @param request Azure HTTP request.
 * @returns An instance of `URL`.
 */
function urlParser(request: HttpRequest, basePath: string) {
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const originalUrl =
    request.headers.get("x-ms-original-url") ||
    request.headers.get("x-original-url") ||
    request.params.path ||
    "/";

  const protocol = request.headers.get("x-forwarded-proto") || "https";
  let url = new URL(`${basePath}/${originalUrl}`, `${protocol}://${host}`);

  // iterate over the search params and append them to the URL
  // this is needed because the URL constructor doesn't support search params
  for (const [key, value] of request.query) {
    url.searchParams.append(key, value);
  }

  return url;
}

/**
 * Creates a response object compatible with Azure Function.
 * @param response A native Fetch `Response` to the incoming request.
 * @returns A Azure function `response init` object.
 */
export async function toAzureResponse(response: Response) {
  const contentType = response.headers.get("Content-Type") || "";
  const isBase64Encoded = isBinaryType(contentType);
  // We make sure to always return a string for the body and not a stream/buffer as Azure Functions for Node.js doesn't support it, yet.
  const body = response.body
    ? await (isBase64Encoded
        ? readableStreamToString(response.body, "base64")
        : response.text())
    : undefined;

  return {
    body,
    headers: Object.fromEntries(response.headers.entries()),
    status: response.status,
  };
}

/**
 * Creates a new instance of a native Fetch `Request` based on the incoming Azure HTTP request object.
 * @param request Azure HTTP request object.
 * @returns An instance of native Fetch `Request`.
 */
export function createFetchRequest(
  request: HttpRequest,
  options: {
    basePath: string;
  },
) {
  const url = urlParser(request, options.basePath);
  const controller = new AbortController();

  const init: RequestInit = {
    method: request.method,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    headers: request.headers,
    signal: controller.signal,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    body: isGetOrHead(request) ? null : request.body,
    duplex: isGetOrHead(request) ? undefined : "half",
  };

  let req = new Request(url, init);
  return req;
}
