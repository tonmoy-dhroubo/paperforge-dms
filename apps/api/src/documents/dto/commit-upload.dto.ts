import { IsUUID } from 'class-validator';

export class CommitUploadDto {
  @IsUUID()
  versionId!: string;
}

