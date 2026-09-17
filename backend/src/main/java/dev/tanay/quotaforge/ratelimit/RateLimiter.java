package dev.tanay.quotaforge.ratelimit;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class RateLimiter {

    private final StringRedisTemplate redis;
    private final DefaultRedisScript<List> script;

    public RateLimiter(StringRedisTemplate redis, DefaultRedisScript<List> slidingWindowScript) {
        this.redis = redis;
        this.script = slidingWindowScript;
    }

    public RateLimitResult check(String apiKey, long maxRequests, long windowSeconds) {
        String key = "ratelimit:" + apiKey;
        long now = System.currentTimeMillis();
        long windowMillis = windowSeconds * 1000L;
        String member = now + "-" + ThreadLocalRandom.current().nextLong();

        List<Long> result = redis.execute(
                script,
                List.of(key),                        // KEYS[1]
                String.valueOf(now),                 // ARGV[1]
                String.valueOf(windowMillis),        // ARGV[2]
                String.valueOf(maxRequests),         // ARGV[3]
                member                               // ARGV[4]
        );

        long allowed   = result.get(0);
        long remaining = result.get(1);
        long count     = result.get(2);

        return new RateLimitResult(allowed == 1L, remaining, count);
    }
}