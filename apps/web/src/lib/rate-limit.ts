const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // ~ 1 minute

export function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const key = `${ip}:${windowMs}`;
  const now = Date.now();
  const userData = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > userData.resetTime) {
    // Reset counter
    userData.count = 1;
    userData.resetTime = now + windowMs;
  } else {
    userData.count++;
  }

  rateLimitMap.set(key, userData);

  return userData.count <= maxRequests;
}

export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         '127.0.0.1';
}
