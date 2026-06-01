type Bucket = {
  tokens: number;
  updatedAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

export function takeToken(key: string, capacity: number, refillPerSecond: number) {
  const now = Date.now();
  const bucket = memoryBuckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const elapsedSeconds = Math.max(0, (now - bucket.updatedAt) / 1000);
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    memoryBuckets.set(key, bucket);
    return { allowed: false, retryAfterMs: Math.ceil((1 - bucket.tokens) / refillPerSecond) * 1000 };
  }

  bucket.tokens -= 1;
  memoryBuckets.set(key, bucket);
  return { allowed: true, retryAfterMs: 0 };
}

export function getRateLimitKey(provider: string, accountId: string, action: string) {
  return `${provider}:${accountId}:${action}`;
}
