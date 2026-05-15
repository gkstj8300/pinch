import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@pinch/ui-tokens';

interface BackArrowProps {
  /**
   * Navigation stack 이 비어있을 때 이동할 fallback 경로.
   * (예: `/login`) — 미지정 시 비어있으면 아무 동작 안 함.
   */
  fallbackHref?: string;
}

/**
 * 네비게이션 헤더 좌측 뒤로가기 버튼 — Ionicons `chevron-back`.
 *
 * 텍스트 글리프(`‹`) 대신 vector 아이콘 사용 — 폰트 의존성 제거하고
 * iOS native chevron 과 시각 동일 확보. 모든 화면에서 일관된 사이즈.
 */
export function BackArrow({ fallbackHref }: BackArrowProps) {
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (fallbackHref !== undefined) {
      router.replace(fallbackHref as never);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="뒤로 가기"
      style={{ paddingHorizontal: 4 }}
    >
      <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
    </Pressable>
  );
}
