package dev.tanay.quotaforge.api;

import dev.tanay.quotaforge.ratelimit.RateLimitResult;
import dev.tanay.quotaforge.ratelimit.RateLimiter;
import dev.tanay.quotaforge.tenant.TenantService;
import dev.tanay.quotaforge.tenant.TenantService.TenantQuota;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
public class RateLimitController {

    private final TenantService tenants;
    private final RateLimiter rateLimiter;

    public RateLimitController(TenantService tenants, RateLimiter rateLimiter) {
        this.tenants = tenants;
        this.rateLimiter = rateLimiter;
    }

    @GetMapping("/api/check")
    public ResponseEntity<String> check(@RequestHeader("X-API-Key") String apiKey) {
        Optional<TenantQuota> quota = tenants.findQuotaByApiKey(apiKey);

        if (quota.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Unknown API key\n");
        }

        TenantQuota q = quota.get();
        RateLimitResult result = rateLimiter.check(apiKey, q.maxRequests(), q.windowSeconds());

        if (result.allowed()) {
            return ResponseEntity.ok()
                    .header("X-RateLimit-Remaining", String.valueOf(result.remaining()))
                    .body("OK (remaining: " + result.remaining() + ")\n");
        } else {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("X-RateLimit-Remaining", "0")
                    .body("Rate limit exceeded\n");
        }
    }
}