import { IsUUID } from 'class-validator';

export class MoveFolderDto {
  @IsUUID()
  newParentId!: string;
}

