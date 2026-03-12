/** @cle/mcp-router — Stub. mcpAutoloadMiddleware no-op. */
import type { Request, Response, NextFunction } from 'express';

export function mcpAutoloadMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
