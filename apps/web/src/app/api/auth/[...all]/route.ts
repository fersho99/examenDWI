import { toNextJsHandler } from "better-auth/next-js";
import { getAuth, isAuthConfigured } from "@/server/auth";
import { apiError } from "@/server/http";

function handler(method: "GET" | "POST") {
  return async (request: Request) => {
    if (!isAuthConfigured()) {
      return apiError("internal", "El acceso no está configurado: faltan DATABASE_URL o BETTER_AUTH_SECRET.");
    }
    return toNextJsHandler(getAuth())[method](request);
  };
}

export const GET = handler("GET");
export const POST = handler("POST");
