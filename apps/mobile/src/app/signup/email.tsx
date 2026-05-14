import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SignupForm } from '@/features/email-signup';

/**
 * 이메일 회원가입 (계획서 §3.2.4).
 * 다중 필드 + 약관 그룹 + 추천코드를 단일 스크롤 폼으로 구성.
 * 헤더 타이틀은 부모 _layout 에서 "이메일로 회원가입" 으로 설정됨.
 */
export default function EmailSignupScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 py-6"
          keyboardShouldPersistTaps="handled"
        >
          <SignupForm onSuccess={() => router.replace('/home')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
