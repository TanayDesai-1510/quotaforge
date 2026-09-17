-- KEYS[1] = the tenant's rate-limit key (e.g. "ratelimit:<api_key>")
-- ARGV[1] = now            (current time in milliseconds)
-- ARGV[2] = window         (window size in milliseconds)
-- ARGV[3] = max_requests   (limit)
-- ARGV[4] = member         (unique id for this request, e.g. "<now>-<random>")
-- Returns: { allowed (1/0), remaining, count }

local key          = KEYS[1]
local now          = tonumber(ARGV[1])
local window       = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local member       = ARGV[4]

-- 1. Evict entries older than the sliding window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- 2. Count what remains in the live window
local count = redis.call('ZCARD', key)

-- 3. Decide
if count < max_requests then
    -- 4a. Allowed: record this request and refresh TTL
    redis.call('ZADD', key, now, member)
    redis.call('PEXPIRE', key, window)
    return { 1, max_requests - count - 1, count + 1 }
else
    -- 4b. Rejected: do NOT record it; still refresh TTL so key expires cleanly
    redis.call('PEXPIRE', key, window)
    return { 0, 0, count }
end