package dev.tanay.quotaforge.tenant;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;

import java.util.Optional;

@Service
public class TenantService {

    private final JdbcTemplate jdbc;

    public TenantService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Cacheable("tenantQuotas")
    public Optional<TenantQuota> findQuotaByApiKey(String apiKey) {
        String sql = """
                SELECT q.max_requests, q.window_seconds
                FROM tenants t
                JOIN quota_configs q ON q.tenant_id = t.id
                WHERE t.api_key = ?
                """;
        return jdbc.query(sql, rs -> {
            if (rs.next()) {
                return Optional.of(new TenantQuota(
                        rs.getLong("max_requests"),
                        rs.getLong("window_seconds")
                ));
            }
            return Optional.empty();
        }, apiKey);
    }

    public record TenantQuota(long maxRequests, long windowSeconds) {
    }
}