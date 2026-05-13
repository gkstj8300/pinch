/**
 * PINCH Slice 1+2 — 선착순 매칭 동시성 부하 테스트 (JWT 인증 포함)
 *
 * 시나리오:
 *   setup 단계에서 200명 워커 각자 dev-login 으로 JWT 발급 →
 *   default 단계에서 200 VUs 가 동시에 모집 1명 공고에 지원.
 *
 * 기대 결과:
 *   - HTTP 201 (MATCHED) 정확히 1건
 *   - HTTP 409 (CAPACITY_FULL 등) 199건
 *   - DB의 jobs.confirmed_count = 1
 *
 * 실행:
 *   pnpm db:seed   # JOB_ID, WORKER_ID_START 출력
 *   MSYS_NO_PATHCONV=1 docker run --rm -i \
 *     -e BASE_URL=http://host.docker.internal:3000 \
 *     -e JOB_ID=<id> -e WORKER_ID_START=<id> \
 *     -v "$(pwd)/k6:/scripts" grafana/k6 run /scripts/apply-stress.js
 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const VUS = 200;

export const options = {
  scenarios: {
    rush: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    matched_total: ['count==1'],
    conflict_total: [`count==${VUS - 1}`],
    http_req_duration: ['p(99)<500'], // 인증 추가로 여유
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JOB_ID = Number(__ENV.JOB_ID || 1);

const matchedTotal = new Counter('matched_total');
const conflictTotal = new Counter('conflict_total');
const otherTotal = new Counter('other_total');
const latencyTrend = new Trend('apply_latency_ms');

/**
 * setup: 200명 워커의 JWT 를 사전 발급 (스트레스 단계의 외란 제거).
 * seed.ts 가 만든 phone 패턴 `0101000XXXX` 를 그대로 사용.
 */
export function setup() {
  const tokens = [];
  const headers = { 'Content-Type': 'application/json' };
  for (let i = 0; i < VUS; i++) {
    const phone = `0101000${String(i).padStart(4, '0')}`;
    const res = http.post(
      `${BASE_URL}/auth/dev-login`,
      JSON.stringify({ phone, role: 'WORKER' }),
      { headers },
    );
    if (res.status !== 200) {
      throw new Error(`dev-login failed for ${phone}: ${res.status} ${res.body}`);
    }
    const body = JSON.parse(res.body);
    tokens.push(body.accessToken);
  }
  return { tokens };
}

export default function (data) {
  const token = data.tokens[exec.vu.idInTest - 1];
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const payload = JSON.stringify({ jobId: JOB_ID });

  const t0 = Date.now();
  const res = http.post(`${BASE_URL}/matches/apply`, payload, { headers });
  latencyTrend.add(Date.now() - t0);

  if (res.status === 201) {
    matchedTotal.add(1);
  } else if (res.status === 409) {
    conflictTotal.add(1);
  } else {
    otherTotal.add(1);
    console.error(`Unexpected status=${res.status}, body=${res.body}`);
  }

  check(res, {
    'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
  });
}

export function handleSummary(data) {
  const matched = data.metrics.matched_total?.values.count ?? 0;
  const conflict = data.metrics.conflict_total?.values.count ?? 0;
  const other = data.metrics.other_total?.values.count ?? 0;
  const p99 = data.metrics.http_req_duration?.values['p(99)'] ?? 0;

  const verdict =
    matched === 1 && conflict === VUS - 1 && other === 0
      ? '✅ PASS - 동시성 차단 확인 (JWT 인증 포함)'
      : '❌ FAIL - race condition 또는 인증 실패';

  const summary = `
==============================================
  PINCH Slice 1+2 — 선착순 매칭 + JWT 동시성 결과
==============================================
  VUs            : ${VUS}
  MATCHED (201)  : ${matched}  (기대값 1)
  CONFLICT (409) : ${conflict} (기대값 ${VUS - 1})
  OTHER          : ${other}    (기대값 0)
  P99 latency    : ${p99.toFixed(1)} ms

  ${verdict}
==============================================
`;

  return { stdout: summary };
}
