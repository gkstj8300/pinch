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

  // 1명 모집 공고 (서울시청)
  const job = await prisma.job.create({
    data: {
      clientId: client.id,
      title: '카페 홀 서빙 (1시간)',
      description: '점심 피크 시간 도움 요청',
      category: 'F&B',
      address: '서울특별시 중구 세종대로 110',
      latitude: 37.5663,
      longitude: 126.9779,
      startAt: new Date(Date.now() + 60 * 60 * 1000), // 1시간 후
      endAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      hourlyWage: 12000,
      estimatedMinutes: 60,
      recruitCount: 1,
      minPinchScore: 0,
      requireVerified: false,
      status: 'OPEN',
    },
  });
  console.log(`✓ 공고 생성: id=${job.id} (모집 1명)`);

  console.log('\n📋 k6 환경변수:');
  console.log(`  JOB_ID=${job.id}`);
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
