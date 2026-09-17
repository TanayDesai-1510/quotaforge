import http from 'k6/http';
import { Counter } from 'k6/metrics';

const allowed = new Counter('allowed_200');
const rejected = new Counter('rejected_429');

export const options = {
  scenarios: {
    burst: {
      executor: 'shared-iterations',
      vus: 50,           // 50 concurrent virtual users
      iterations: 500,   // 500 total requests, split across them
      maxDuration: '30s',
    },
  },
};

export default function () {
  const res = http.get('http://localhost:8081/api/check', {
    headers: { 'X-API-Key': 'test-key-acme-001' },
  });
  if (res.status === 200) allowed.add(1);
  else if (res.status === 429) rejected.add(1);
}