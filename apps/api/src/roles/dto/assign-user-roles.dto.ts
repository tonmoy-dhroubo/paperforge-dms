import { ArrayNotEmpty, IsArray, IsString, MaxLength } from 'class-validator';

export class AssignUserRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  roles!: string[];
}

