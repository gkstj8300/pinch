import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class DevLoginDto {
  @IsString()
  @Length(10, 15)
  @Matches(/^\d+$/, { message: 'phone must contain only digits' })
  phone!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;
}
