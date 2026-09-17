package dev.tanay.quotaforge.ratelimit;

public record RateLimitResult(boolean allowed, long remaining, long count) {}