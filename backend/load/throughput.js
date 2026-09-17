import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    sustained: {
      executor: 'constant-vus',
      vus: 50,             // 50 concurrent workers
      duration: '30s',     // hold that load for 30 seconds
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],   // <1% errors expected
    http_req_duration: ['p(95)<50'],  // sanity bar; we read the real value regardless
  },
};

export default function () {
  const res = http.get('http://localhost:8081/api/check', {
    headers: { 'X-API-Key': 'loadtest-key-001' },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
}