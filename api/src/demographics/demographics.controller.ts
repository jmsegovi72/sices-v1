import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Auth, AuthModulePermission, GetUser } from '@/auth/decorators';
import {
  type ApiResponse,
  ParsePositiveIntPipe,
  SearchDto,
  TransformDataInterceptor,
  type UserFromView,
} from '@/common';
import { ACCESS_LEVEL, SystemModules } from '@/common/constants';
import { DemographicsService } from './demographics.service';
import { CreateManyDemographicDto, QueryDemographicDto } from './dto';
import { CreateDemographicDto } from './dto/create-demographic.dto';
import { UpdateDemographicDto } from './dto/update-demographic.dto';

@Controller('demographics')
export class DemographicsController {
  constructor(private readonly demographicsService: DemographicsService) {}

  /* ============================================================
     👤 CREATE DEMOGRAPHIC (SICES V3)
     ------------------------------------------------------------
     📌 Endpoint protegido que registra datos demográficos de una persona.
     ============================================================ */
  @Post()
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DEMOGRAPHICS, 'create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: UserFromView,
    @Body() createDemographicDto: CreateDemographicDto,
  ): Promise<ApiResponse<any>> {
    return await this.demographicsService.create({
      userId: user.id,
      dto: createDemographicDto,
      options: { returnData: false },
    });
  }
  /* ============================================================
   🆕 CREATE MANY DEMOGRAPHICS (SICES V3)
   ------------------------------------------------------------
   📌 Endpoint protegido para inserción masiva de datos demográficos.
   ============================================================ */
  @Post('/bulk')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DEMOGRAPHICS, 'create')
  @HttpCode(HttpStatus.CREATED)
  async createMany(
    @GetUser() user: UserFromView,
    @Body() createManyDemographicDto: CreateManyDemographicDto,
  ): Promise<ApiResponse<void>> {
    return await this.demographicsService.createMany({
      userId: user.id,
      dto: createManyDemographicDto,
      options: { returnData: false },
    });
  }
  @Get('/query')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DEMOGRAPHICS, 'read')
  @UseInterceptors(TransformDataInterceptor)
  @HttpCode(HttpStatus.OK)
  async findMany(
    @Query() filters: QueryDemographicDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.demographicsService.findMany(filters);
  }

  /* ============================================================
 🔍 FIND ONE DEMOGRAPHIC BY CRITERIA (SICES V3)
 ------------------------------------------------------------
 📌 Endpoint para buscar datos demográficos
 usando un término flexible (ID, personId o CURP).
============================================================ */
  @Get(':search')
  @UseInterceptors(TransformDataInterceptor)
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DEMOGRAPHICS, 'read')
  @HttpCode(HttpStatus.OK)
  async findOneBy(
    @Param('search') search: string,
    @Query('light') light?: string,
  ) {
    // 1️⃣ Transformar string → DTO
    const searchDto = plainToClass(SearchDto, { search });
    // 2️⃣ Validar DTO
    try {
      await validateOrReject(searchDto);
    } catch {
      throw new BadRequestException(
        'El término de búsqueda no tiene un formato válido.',
      );
    }
    // 3️⃣ Llamar al service
    return await this.demographicsService.findOneBy({
      searchDto,
      options: {
        light: light === 'true' || light === '1',
      },
    });
  }

  @Patch(':id')
  @Auth(ACCESS_LEVEL.dbDataWriter)
  @AuthModulePermission(SystemModules.DEMOGRAPHICS, 'update')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetUser() user: UserFromView,
    @Param('id', ParsePositiveIntPipe) id: number,
    @Body() updateDemographicDto: UpdateDemographicDto,
  ): Promise<ApiResponse<any>> {
    return await this.demographicsService.update({
      userId: user.id,
      id,
      dto: updateDemographicDto,
      options: { returnData: false },
    });
  }
}
