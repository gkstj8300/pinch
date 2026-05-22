import Image from 'next/image';
import logoPng from '@pinch/brand-assets/logo/logo.png';
import logoSecondaryPng from '@pinch/brand-assets/logo/logo-secon.png';
import logoIcon from '@pinch/brand-assets/logo/logo-icon.png';

interface LogoProps {
  /** 표시 변형 — 'primary'(기본) / 'secondary'(어두운 배경용) */
  variant?: 'primary' | 'secondary' | 'icon';
  /** 정사각형 한 변 픽셀 — 1차는 정사각 로고 가정 */
  size?: number;
  /** alt 텍스트 — 접근성 */
  alt?: string;
  className?: string;
  /** 첫 화면 LCP 가속 — splash / login 헤더용 */
  priority?: boolean;
}

/**
 * PINCH 로고 컴포넌트 — packages/brand-assets 의 PNG 를 next/image 로 렌더.
 * 크기는 정사각 가정. 비정사각 도입 시 width/height 분리 props 추가.
 */
export function Logo({
  variant = 'primary',
  size = 48,
  alt = 'PINCH',
  className,
  priority,
}: LogoProps) {
  const src = variant === 'primary' ? logoPng : variant === 'icon' ? logoIcon : logoSecondaryPng;
  return (
    <Image
      src={src}
      width={size}
      height={size}
      alt={alt}
      className={className}
      priority={priority}
    />
  );
}
