import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    //const tokens = await this.generateTokens(user.id, user.email);

    await this.createEmailVerification(user.email);

    return {
      message: 'A verification code has been sent to your email.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshTokenHash,
      },
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  private async generateTokens(userId: number, email: string) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private sanitizeUser(user: any) {
    const { password, refreshTokenHash, ...safeUser } = user;

    return safeUser;
  }

  private generateVerificationCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private async createEmailVerification(email: string): Promise<void> {
    const code = this.generateVerificationCode();

    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.emailVerification.deleteMany({
      where: {
        email,
      },
    });

    await this.prisma.emailVerification.create({
      data: {
        email,
        codeHash,
        expiresAt,
      },
    });

    await this.emailService.sendVerificationCode(email, code);
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid verification request');
    }

    if (user.emailVerified) {
      return {
        message: 'Email is already verified.',
      };
    }

    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      throw new UnauthorizedException('Verification code not found.');
    }

    if (verification.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification code has expired.');
    }

    if (verification.attempts >= 5) {
      throw new UnauthorizedException('Too many verification attempts.');
    }

    const valid = await bcrypt.compare(code, verification.codeHash);

    if (!valid) {
      await this.prisma.emailVerification.update({
        where: {
          id: verification.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException('Invalid verification code.');
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: true,
      },
    });

    await this.prisma.emailVerification.delete({
      where: {
        id: verification.id,
      },
    });

    return {
      message: 'Email verified successfully.',
    };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user && !user.emailVerified) {
      await this.createEmailVerification(email);
    }

    return {
      message: 'If this email requires verification, a new code has been sent.',
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);

      if (!valid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user.id, user.email);

      const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 12);

      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          refreshTokenHash,
        },
      });

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        refreshTokenHash: null,
      },
    });

    return {
      message: 'Logged out successfully.',
    };
  }
}
