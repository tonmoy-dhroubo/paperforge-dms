import { IsArray, IsString, MaxLength } from 'class-validator';

export class SetPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  permissions!: string[];
}

