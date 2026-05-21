import { ClientLoginForm } from '@/features/client-login';

/**
 * 사업주 이메일 로그인 페이지.
 * Server component (정적) — 안쪽의 ClientLoginForm 만 client.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-bg-secondary) px-(--spacing-04)">
      <div className="w-full max-w-md rounded-(--radius-04) bg-(--color-bg-primary) p-(--spacing-07) shadow-md">
        <header className="mb-(--spacing-06) text-center">
          <h1 className="text-2xl font-bold text-(--color-identity)">PINCH</h1>
          <p className="mt-(--spacing-01) text-sm text-(--color-text-secondary)">
            사업주 로그인
          </p>
        </header>
        <ClientLoginForm />
      </div>
    </main>
  );
}
