import { Logo } from '@/shared/ui';
import { ClientLoginForm } from '@/features/client-login';

/**
 * 사업주 로그인 페이지 — Figma `node-id=521:22613` 매핑.
 *   - 부모: 회색 배경(bg-secondary) 중앙 정렬
 *   - 카드: gray-0 bg + gray-20 border + radius 12 + shadow + padding 36
 *   - 헤더: 50×50 Logo + "핀치 사업주 시스템" (SemiBold 20)
 *   - gap-32 사이: 헤더 ↔ 폼
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-bg-secondary) px-(--spacing-04)">
      <div
        className="flex w-full max-w-md flex-col items-center gap-(--spacing-07) rounded-(--radius-03) border border-(--color-gray-20) bg-(--color-gray-0) p-9 shadow-[4px_4px_10px_0_rgba(0,0,0,0.1)]"
      >
        <header className="flex flex-col items-center justify-center">
          <Logo variant="primary" size={50} priority alt="PINCH" />
          <h1 className="text-xl font-semibold text-(--color-text-primary)">
            핀치 사업주 시스템
          </h1>
        </header>
        <ClientLoginForm />
      </div>
    </main>
  );
}
