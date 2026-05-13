import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { KakaoOAuthService } from './kakao-oauth.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET not configured');
        const expiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '1d';
        // @nestjs/jwt v11 + jsonwebtoken 의 SignOptions.expiresIn 은 ms 의
        // StringValue 템플릿 리터럴 타입을 요구하나 env 는 일반 string. 런타임
        // 동작은 동일하므로 unknown 캐스트로 우회.
        return {
          secret,
          signOptions: { expiresIn: expiresIn as unknown as number },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, KakaoOAuthService],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
