import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { CommitUploadDto } from './dto/commit-upload.dto';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateDocumentDto) {
    return this.documents.createDocumentWithUpload(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: any, @Param('id') id: string) {
    return this.documents.getDocumentForRead(user, id);
  }

  @Get(':id/versions')
  listVersions(@CurrentUser() user: any, @Param('id') id: string) {
    return this.documents.listDocumentVersionsForRead(user, id);
  }

  @Post(':id/versions')
  createVersion(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateVersionDto) {
    return this.documents.createNewVersionUpload(user, id, dto.filename);
  }

  @Post('versions/commit')
  commit(@CurrentUser() user: any, @Body() dto: CommitUploadDto) {
    return this.documents.commitVersionUpload(user, dto.versionId);
  }

  @Get('versions/:versionId/download-url')
  downloadUrl(@CurrentUser() user: any, @Param('versionId') versionId: string) {
    return this.documents.getDownloadUrl(user, versionId);
  }

  @Get('versions/:versionId/ocr')
  ocrStatus(@CurrentUser() user: any, @Param('versionId') versionId: string) {
    return this.documents.getOcrStatus(user, versionId);
  }

  @Get('versions/:versionId/ocr/pages')
  ocrPages(
    @CurrentUser() user: any,
    @Param('versionId') versionId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromPage = from ? Number(from) : undefined;
    const toPage = to ? Number(to) : undefined;
    return this.documents.listOcrPages(user, versionId, fromPage, toPage);
  }

  @Post('versions/:versionId/ocr/retry')
  ocrRetry(@CurrentUser() user: any, @Param('versionId') versionId: string) {
    return this.documents.retryOcr(user, versionId);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.documents.softDeleteDocument(user, id);
  }

  @Post(':id/restore')
  restore(@CurrentUser() user: any, @Param('id') id: string) {
    return this.documents.restoreDocument(user, id);
  }
}
