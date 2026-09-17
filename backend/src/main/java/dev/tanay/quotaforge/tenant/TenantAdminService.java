package dev.tanay.quotaforge.tenant;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class TenantAdminService {

    private final JdbcTemplate jdbc;
    private final StringRedisTemplate redis;
    private final SecureRandom random = new SecureRandom();

    public TenantAdminService(JdbcTemplate jdbc, StringRedisTemplate redis) {
        this.jdbc = jdbc;
        this.redis = redis;
    }

    @Transactional
    public TenantView create(String name, long maxRequests, long windowSeconds) {
        String apiKey = generateApiKey();
        UUID id = jdbc.queryForObject(
                "INSERT INTO tenants (name, api_key) VALUES (?, ?) RETURNING id",
                UUID.class, name, apiKey);
        jdbc.update(
                "INSERT INTO quota_configs (tenant_id, max_requests, window_seconds) VALUES (?, ?, ?)",
                id, maxRequests, windowSeconds);
        return new TenantView(id, name, apiKey, maxRequests, windowSeconds);
    }

    public List<TenantView> listAll() {
        return jdbc.query("""
                SELECT t.id, t.name, t.api_key, q.max_requests, q.window_seconds
                FROM tenants t
                JOIN quota_configs q ON q.tenant_id = t.id
                ORDER BY t.created_at DESC
                """,
                (rs, rowNum) -> new TenantView(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        rs.getString("api_key"),
                        rs.getLong("max_requests"),
                        rs.getLong("window_seconds")));
    }

    @Transactional
    public boolean delete(UUID id) {
        int rows = jdbc.update("DELETE FROM tenants WHERE id = ?", id);
        return rows > 0;
    }

    public long currentUsage(String apiKey, long windowSeconds) {
        String key = "ratelimit:" + apiKey;
        long now = System.currentTimeMillis();
        long windowStart = now - (windowSeconds * 1000L);
        Long count = redis.opsForZSet().count(key, windowStart, now);
        return count == null ? 0 : count;
    }

    private String generateApiKey() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return "qf_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public record TenantView(UUID id, String name, String apiKey,
                             long maxRequests, long windowSeconds) {
    }
}