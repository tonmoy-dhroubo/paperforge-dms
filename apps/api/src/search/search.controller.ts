import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(AuthGuard('jwt'))
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(
    @CurrentUser() user: { sub: string; roles: string[] },
    @Query('q') q?: string,
    @Query('folderId') folderId?: string,
    @Query('filename') filename?: string,
    @Query('allVersions') allVersions?: string,
    @Query('from') from?: string,
    @Query('size') size?: string,
  ) {
    const query = (q || '').trim();
    if (!query) throw new BadRequestException('q is required');

    const fromNum = from ? Number(from) : 0;
    const sizeNum = size ? Number(size) : 20;

    return this.search.search(user, {
      q: query,
      folderId: folderId?.trim() || undefined,
      filename: filename?.trim() || undefined,
      allVersions: (allVersions || '').toLowerCase() === 'true',
      from: Number.isFinite(fromNum) ? Math.max(0, fromNum) : 0,
      size: Number.isFinite(sizeNum) ? Math.min(100, Math.max(1, sizeNum)) : 20,
    });
  }
}

