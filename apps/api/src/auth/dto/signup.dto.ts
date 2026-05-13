import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @Length(2, 50)
  name!: string;

  @IsBoolean()
  termsAgreed!: boolean;

  @IsOptional()
  @IsBoolean()
  marketingConsented?: boolean;
}
