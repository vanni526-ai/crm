import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

/**
 * API Discovery Router
 * 
 * Provides endpoints for external applications (like mobile apps) to discover
 * the correct backend API configuration, including base URL and available endpoints.
 * 
 * This solves the problem of port changes in development/production environments
 * by allowing apps to dynamically discover the correct backend URL.
 */

export const apiDiscoveryRouter = router({
  /**
   * Get backend API configuration
   * 
   * Returns the current backend URL and API endpoints that external apps should use.
   * This endpoint is public and doesn't require authentication.
   * 
   * Usage example (from App):
   * ```typescript
   * const response = await fetch('https://crm.bdsm.com.cn/api/discovery/config');
   * const config = await response.json();
   * // Use config.baseUrl for all subsequent API calls
   * ```
   */
  getConfig: publicProcedure.query(async ({ ctx }) => {
    // Get the request host from headers
    const host = ctx.req.headers.host || 'localhost:3000';
    const protocol = ctx.req.headers['x-forwarded-proto'] || 
                     (ctx.req.connection as any).encrypted ? 'https' : 'http';
    
    // Construct the base URL without port (production) or with port (development)
    let baseUrl: string;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, use the custom domain without port
      baseUrl = `${protocol}://${host.split(':')[0]}`;
    } else {
      // In development, use the full host with port
      baseUrl = `${protocol}://${host}`;
    }
    
    return {
      baseUrl,
      apiEndpoint: `${baseUrl}/api/trpc`,
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      endpoints: {
        trpc: '/api/trpc',
        oauth: '/api/oauth',
        discovery: '/api/discovery',
      },
      cors: {
        enabled: true,
        allowedOrigins: [
          '*.manus.computer',
          '*.manus-asia.computer',
          '*.manuspre.computer',
          '*.manuscomputer.ai',
          '*.manusvm.computer',
          'localhost',
        ],
      },
    };
  }),

  /**
   * Health check endpoint
   * 
   * Simple endpoint to check if the backend is running and accessible.
   */
  health: publicProcedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }),
});
