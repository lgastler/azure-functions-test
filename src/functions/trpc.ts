import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import {
  createFetchRequest,
  toAzureResponse,
} from "../server/translation-layer";
import { appRouter } from "../server/index";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Request-Method": "*",
  "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
  "Access-Control-Allow-Headers": "*",
};

export async function httpTrigger(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("HTTP trigger function got a request.");
  if (request.method === "OPTIONS") {
    return {
      status: 200,
      headers: corsHeaders,
    };
  }
  context.log("Passed Options / CORS check");

  const fetchRequest = createFetchRequest(request, {
    basePath: "/api/trpc",
  });
  context.log("Created Fetch Request");
  const fetchResponse = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: fetchRequest,
    router: appRouter,
    createContext: () => ({}),
  });
  context.log("Handled Fetch Request");
  const azureResponse = await toAzureResponse(fetchResponse);
  azureResponse.headers = {
    ...azureResponse.headers,
    ...corsHeaders,
  };
  context.log("Returning Azure Response");
  return azureResponse;
}

app.http("trpc", {
  methods: [
    "GET",
    "POST",
    "DELETE",
    "HEAD",
    "PATCH",
    "PUT",
    "OPTIONS",
    "TRACE",
    "CONNECT",
  ],
  authLevel: "anonymous",
  handler: httpTrigger,
  route: "trpc/{*path}",
});
