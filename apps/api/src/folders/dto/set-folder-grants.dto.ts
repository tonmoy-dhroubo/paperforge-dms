import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsString, MaxLength, ValidateNested } from 'class-validator';

export class SetFolderGrantsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FolderGrantItemDto)
  grants!: FolderGrantItemDto[];
}

export class FolderGrantItemDto {
  @IsString()
  @MaxLength(64)
  roleName!: string;

  @IsIn(['OWNER', 'VIEWER'])
  operationalRole!: 'OWNER' | 'VIEWER';
}
