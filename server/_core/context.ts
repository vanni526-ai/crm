import { COOKIE_NAME } from "@shared/const";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication failed - check if it's a signature verification error
    const errorMessage = String(error);
    if (errorMessage.includes('JWSSignatureVerificationFailed') || 
        errorMessage.includes('signature verification failed') ||
        errorMessage.includes('Invalid session cookie')) {
      // Clear the invalid cookie to allow re-login
      const cookieOptions = getSessionCookieOptions(opts.req);
      opts.res.clearCookie(COOKIE_NAME, cookieOptions);
      console.log('[Auth] Cleared invalid session cookie due to signature verification failure');
    }
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
