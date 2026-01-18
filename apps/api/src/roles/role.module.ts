import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { User } from '../auth/entities/user.entity';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Role, User])],
  controllers: [RoleController],
  providers: [RoleService, RolesGuard],
})
export class RoleModule {}
