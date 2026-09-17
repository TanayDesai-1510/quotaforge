CREATE TABLE quota_configs (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID        NOT NULL UNIQUE REFERENCES tenants (id) ON DELETE CASCADE,
    max_requests      INTEGER     NOT NULL,
    window_seconds    INTEGER     NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_max_requests_positive   CHECK (max_requests > 0),
    CONSTRAINT chk_window_seconds_positive CHECK (window_seconds > 0)
);