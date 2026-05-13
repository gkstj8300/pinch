/**
 * Slice 1 PoC 시드
 * - 사업주 1명
 * - 워커 200명 (모두 인증 + score=1000)
 * - 모집 1명짜리 공고 1개 (서울시청 좌표)
 *
 * k6 시나리오에서 200명이 동시 지원 → 정확히 1명만 MATCHED 검증
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 시드 시작');

  // 모든 데이터 초기화 (PoC 단계) — FK 의존성 역순으로 삭제
  await prisma.review.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.match.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();

  // 사업주
  const client = await prisma.user.create({
    data: {
      phone: '01000000000',
      name: '핀치 카페',
      role: 'CLIENT',
      isVerified: true,
    },
  });
  console.log(`✓ 사업주 생성: id=${client.id}`);

  // 워커 200명
  const workerData = Array.from({ length: 200 }, (_, i) => ({
    phone: `0101000${String(i).padStart(4, '0')}`,
    name: `워커${i + 1}`,
    role: 'WORKER' as const,
    isVerified: true,
    pinchScore: 1000,
  }));
  const workers = await prisma.user.createManyAndReturn({ data: workerData });
  console.log(`✓ 워커 ${workers.length}명 생성 (id=${workers[0].id}~${workers[workers.length - 1].id})`);

  // 1명 모집 공고 (서울시청) — k6 동시성 테스트 대상
  const stressJob = await prisma.job.create({
    data: {
      clientId: client.id,
      title: '카페 홀 서빙 (1시간)',
      description: '점심 피크 시간 도움 요청',
      category: 'F&B',
      address: '서울특별시 중구 세종대로 110',
      latitude: 37.5663,
      longitude: 126.9779,
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      endAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      hourlyWage: 12000,
      estimatedMinutes: 60,
      recruitCount: 1,
      minPinchScore: 0,
      requireVerified: false,
      status: 'OPEN',
    },
  });
  console.log(`✓ 공고 생성: id=${stressJob.id} (모집 1명, 서울시청 — k6 대상)`);

  // 위치 다양화 공고 (search 테스트용) — 모집 인원 여유 있음
  const searchJobs = [
    { title: '강남역 편의점 야간', category: 'RETAIL',  address: '서울특별시 강남구 강남대로 396', lat: 37.4979, lng: 127.0276, wage: 11_000, minutes: 240 },
    { title: '홍대 클럽 입구 보안', category: 'EVENT',   address: '서울특별시 마포구 양화로 160', lat: 37.5572, lng: 126.9249, wage: 15_000, minutes: 360 },
    { title: '잠실 행사 도우미',    category: 'EVENT',   address: '서울특별시 송파구 올림픽로 240', lat: 37.5133, lng: 127.1000, wage: 13_000, minutes: 300 },
    { title: '명동 카페 주말 알바', category: 'F&B',     address: '서울특별시 중구 명동길 26',     lat: 37.5636, lng: 126.9869, wage: 12_500, minutes: 480 },
    { title: '여의도 행사 진행',    category: 'EVENT',   address: '서울특별시 영등포구 여의대로 70', lat: 37.5219, lng: 126.9245, wage: 16_000, minutes: 240 },
    { title: '부산역 짐 운반',      category: 'LOGISTICS', address: '부산광역시 동구 중앙대로 206', lat: 35.1156, lng: 129.0419, wage: 13_500, minutes: 120 },
  ];
  for (const j of searchJobs) {
    await prisma.job.create({
      data: {
        clientId: client.id,
        title: j.title,
        description: `${j.title} — 단기 알바`,
        category: j.category,
        address: j.address,
        latitude: j.lat,
        longitude: j.lng,
        startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),  // 2h 후
        endAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + j.minutes * 60_000),
        hourlyWage: j.wage,
        estimatedMinutes: j.minutes,
        recruitCount: 5,
        minPinchScore: 0,
        requireVerified: false,
        status: 'OPEN',
      },
    });
  }
  console.log(`✓ 추가 공고 ${searchJobs.length}개 (search 테스트용 — 서울 5 + 부산 1)`);

  console.log('\n📋 k6 환경변수:');
  console.log(`  JOB_ID=${stressJob.id}`);
  console.log(`  WORKER_ID_START=${workers[0].id}`);
  console.log(`  WORKER_ID_END=${workers[workers.length - 1].id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
