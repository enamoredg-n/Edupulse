import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditAction } from '@prisma/client';
import { compare } from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        collegeId: true,
        college: {
          select: {
            id: true,
            name: true,
            code: true,
            logoUrl: true,
          },
        },
        passwordHash: true,
        departmentId: true,
        semesterNumber: true,
      },
    });

    if (!user || !(await compare(loginDto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
    });

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      collegeId: user.collegeId,
      college: user.college,
      departmentId: user.departmentId,
      semesterNumber: user.semesterNumber,
    };
    await this.auditService.log({
      action: AuditAction.LOGIN,
      actorId: user.id,
      collegeId: user.collegeId,
      entity: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        collegeCode: user.college.code,
      },
    });

    return { accessToken: token, user: safeUser };
  }
}
