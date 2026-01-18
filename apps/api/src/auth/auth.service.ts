import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from './entities/user.entity';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

type JwtPayload = {
  sub: string;
  username: string;
  roles: string[];
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(body: RegisterDto) {
    const username = body.username.trim();
    const email = body.email.trim().toLowerCase();

    const existingUsername = await this.userRepo.findOne({ where: { username } });
    if (existingUsername) throw new ConflictException('Username already exists');

    const existingEmail = await this.userRepo.findOne({ where: { email } });
    if (existingEmail) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(body.password, 10);

    const role = await this.resolveRegistrationRole();
    const user = this.userRepo.create({
      username,
      email,
      passwordHash,
      roles: role ? [role] : [],
    });
    const saved = await this.userRepo.save(user);
    const reloaded = await this.userRepo.findOne({ where: { id: saved.id }, relations: ['roles'] });
    return this.buildAuthResponse(reloaded || saved);
  }

  async login(body: LoginDto) {
    const identifier = body.usernameOrEmail.trim();
    const user = await this.userRepo.findOne({
      where: [{ username: identifier }, { email: identifier.toLowerCase() }],
      relations: ['roles'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.enabled) throw new UnauthorizedException('Account is disabled');

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      'paperforge-dev-secret';

    let payload: JwtPayload & { tokenType?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['roles'],
    });
    if (!user) throw new UnauthorizedException('Invalid refresh token');

    if (!user.refreshTokenHash) throw new UnauthorizedException('Invalid refresh token');
    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) throw new UnauthorizedException('Invalid refresh token');

    return this.buildAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['roles'] });
    if (!user) throw new UnauthorizedException();
    return this.mapUser(user);
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      enabled: user.enabled,
      roles: user.roles?.map((r) => r.name) || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async resolveRegistrationRole() {
    const userCount = await this.userRepo.count();
    const firstUserAdminEnabled = (this.config.get<string>('AUTH_FIRST_USER_ADMIN') || 'true')
      .toLowerCase()
      .trim() === 'true';

    if (userCount === 0 && firstUserAdminEnabled) {
      return this.roleRepo.findOne({ where: { name: 'ADMIN' } });
    }

    const defaultRole = (this.config.get<string>('AUTH_DEFAULT_ROLE') || 'HR').trim();
    return this.roleRepo.findOne({ where: { name: defaultRole } });
  }

  private async buildAuthResponse(user: User) {
    const roles = user.roles?.map((r) => r.name) || [];
    const payload: JwtPayload = { sub: user.id, username: user.username, roles };

    const token = await this.jwt.signAsync(payload);
    const refreshToken = await this.signRefreshToken(payload);

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userRepo.save(user);

    return {
      token,
      refreshToken,
      type: 'Bearer',
      user: this.mapUser(user),
    };
  }

  private async signRefreshToken(payload: JwtPayload) {
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      'paperforge-dev-secret';
    const refreshExpiration = (this.config.get<string>('JWT_REFRESH_EXPIRATION') || '7d') as any;

    return this.jwt.signAsync(
      { ...payload, tokenType: 'refresh' },
      { secret: refreshSecret, expiresIn: refreshExpiration },
    );
  }
}
