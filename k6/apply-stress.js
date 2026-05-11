/**
 * PINCH Slice 1 — 선착순 매칭 동시성 부하 테스트
 *
 * 시나리오:
 *   200 VUs 가 동시에 모집 1명 공고에 지원.
 *   기대 결과:
 *     - HTTP 201 (MATCHED) 정확히 1건
 *     - HTTP 409 (CAPACITY_FULL 등) 199건
 *     - DB의 jobs.confirmed_count = 1
 *     - DB의 matches 레코드 = 1건
 *
 * 실행:
 *   pnpm db:seed   # → JOB_ID, WORKER_ID_START 출력
 *   JOB_ID=1 WORKER_ID_START=2 k6 run k6/apply-stress.js
 *
 * Docker로 실행할 경우:
 *   docker run --rm -i --network=host \
 *     -e JOB_ID=1 -e WORKER_ID_START=2 \
 *     -v "$PWD/k6:/scripts" grafana/k6 run /scripts/apply-stress.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const VUS = 200;

export const options = {
  scenarios: {
    rush: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    matched_total: ['count==1'],          // 정확히 1명만 매칭
    conflict_total: [`count==${VUS - 1}`], // 나머지 모두 409
    http_req_duration: ['p(99)<300'],     // P99 < 300ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JOB_ID = Number(__ENV.JOB_ID || 1);
const WORKER_ID_START = Number(__ENV.WORKER_ID_START || 2);

const matchedTotal = new Counter('matched_total');
const conflictTotal = new Counter('conflict_total');
const otherTotal = new Counter('other_total');
const latencyTrend = new Trend('apply_latency_ms');

export default function () {
  // 각 VU 가 고유 워커 ID 사용
  const workerId = WORKER_ID_START + exec.vu.idInTest - 1;

  const payload = JSON.stringify({ jobId: JOB_ID, workerId });
  const params = { headers: { 'Content-Type': 'application/json' } };

  const t0 = Date.now();
  const res = http.post(`${BASE_URL}/matches/apply`, payload, params);
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
      ? '✅ PASS - 동시성 차단 확인'
      : '❌ FAIL - race condition 발생 가능';

  const summary = `
==============================================
  PINCH Slice 1 — 선착순 매칭 동시성 결과
==============================================
  VUs            : ${VUS}
  MATCHED (201)  : ${matched}  (기대값 1)
  CONFLICT (409) : ${conflict} (기대값 ${VUS - 1})
  OTHER          : ${other}    (기대값 0)
  P99 latency    : ${p99.toFixed(1)} ms

  ${verdict}
==============================================
`;

  return {
    stdout: summary,
  };
}
