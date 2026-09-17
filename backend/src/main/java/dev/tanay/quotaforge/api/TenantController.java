package dev.tanay.quotaforge.api;

import dev.tanay.quotaforge.tenant.TenantAdminService;
import dev.tanay.quotaforge.tenant.TenantAdminService.TenantView;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/tenants")
public class TenantController {

    private final TenantAdminService tenantAdmin;

    public TenantController(TenantAdminService tenantAdmin) {
        this.tenantAdmin = tenantAdmin;
    }

    public record CreateTenantRequest(String name, long maxRequests, long windowSeconds) {}

    public record TenantWithUsage(TenantView tenant, long currentUsage) {}

    @PostMapping
    public ResponseEntity<TenantView> create(@RequestBody CreateTenantRequest req) {
        TenantView created = tenantAdmin.create(req.name(), req.maxRequests(), req.windowSeconds());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public List<TenantWithUsage> list() {
        return tenantAdmin.listAll().stream()
                .map(t -> new TenantWithUsage(
                        t, tenantAdmin.currentUsage(t.apiKey(), t.windowSeconds())))
                .toList();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        boolean deleted = tenantAdmin.delete(id);
        return deleted
                ? ResponseEntity.noContent().build()   // 204
                : ResponseEntity.notFound().build();    // 404
    }
}