import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmailLoginForm } from '@/features/email-login';

/**
 * 이메일 로그인 (계획서 §3.2.3).
 * 헤더 타이틀은 부모 _layout 에서 "이메일로 로그인" 으로 설정됨.
 */
export default function EmailLoginScreen() {
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
          <EmailLoginForm onSuccess={() => router.replace('/home')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
