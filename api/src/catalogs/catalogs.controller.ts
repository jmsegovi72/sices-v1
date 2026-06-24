import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { Auth } from '@/auth/decorators';
import { ACCESS_LEVEL } from '@/common/constants';
import { TransformDataInterceptor } from '@/common/interceptors';
import { ApiResponse } from '@/common/interfaces';
import { CatalogsService } from './catalogs.service';
import { QueryMunicipalityDto, QueryStudyPlanDto, QueryTeacherDto } from './dto';

@Controller()
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  /* ============================================================
     📋 GET /roles
     ------------------------------------------------------------
     📌 Devuelve la lista completa de roles.
     ============================================================ */
  @Get('roles')
  @UseInterceptors(TransformDataInterceptor)
  async getRoles(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getRoles();
  }

  /* ============================================================
     📋 GET /user-types
     ------------------------------------------------------------
     📌 Devuelve la lista completa de tipos de usuario.
     ============================================================ */
  @Get('user-types')
  @UseInterceptors(TransformDataInterceptor)
  async getUserTypes(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getUserTypes();
  }

  /* ============================================================
     📋 GET /street-types
     ------------------------------------------------------------
     📌 Devuelve la lista completa de tipos de vialidad (calle, avenida, etc.).
     ============================================================ */
  @Get('street-types')
  @UseInterceptors(TransformDataInterceptor)
  async getStreetTypes(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getStreetTypes();
  }

  /* ============================================================
     📋 GET /settlement-types
     ------------------------------------------------------------
     📌 Devuelve la lista completa de tipos de asentamiento (colonia, fraccionamiento, etc.).
     ============================================================ */
  @Get('settlement-types')
  @UseInterceptors(TransformDataInterceptor)
  async getSettlementTypes(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getSettlementTypes();
  }

  /* ============================================================
     📋 GET /settlements/:zipCode
     ------------------------------------------------------------
     📌 Devuelve la lista de asentamientos (colonias) asociados a un código postal.
     ============================================================ */
  @Get('settlements/:zipCode')
  @UseInterceptors(TransformDataInterceptor)
  async getSettlementsByZipCode(
    @Param('zipCode') zipCode: string,
  ): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getSettlementsByZipCode(zipCode);
  }

  /* ============================================================
     📋 GET /states
     ------------------------------------------------------------
     📌 Devuelve la lista completa de estados de la República Mexicana.
     ============================================================ */
  @Get(['states', 'catalog/states'])
  @UseInterceptors(TransformDataInterceptor)
  async getStates(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getStates();
  }

  /* ============================================================
     📋 GET /municipalities
     ------------------------------------------------------------
     📌 Devuelve los municipios filtrados por estado o búsqueda.
     ============================================================ */
  @Get(['municipalities', 'catalog/municipalities'])
  @UseInterceptors(TransformDataInterceptor)
  async getMunicipalities(
    @Query() query: QueryMunicipalityDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getMunicipalities(query);
  }

  /* ============================================================
     📋 GET /marital-statuses
     ------------------------------------------------------------
     📌 Devuelve la lista completa de estados civiles.
     ============================================================ */
  @Get(['marital-statuses', 'catalog/marital-statuses'])
  @UseInterceptors(TransformDataInterceptor)
  async getMaritalStatuses(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getMaritalStatuses();
  }

  /* ============================================================
     📋 GET /contact-relationships
     ------------------------------------------------------------
     📌 Devuelve la lista completa de parentescos de contactos de emergencia.
     ============================================================ */
  @Get(['contact-relationships', 'catalog/contact-relationships'])
  @UseInterceptors(TransformDataInterceptor)
  async getContactRelationships(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getContactRelationships();
  }

  /* ============================================================
     📋 GET /indigenous-languages
     ------------------------------------------------------------
     📌 Devuelve la lista completa de lenguas indígenas.
     ============================================================ */
  @Get(['indigenous-languages', 'catalog/indigenous-languages'])
  @UseInterceptors(TransformDataInterceptor)
  async getIndigenousLanguages(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getIndigenousLanguages();
  }

  /* ============================================================
     📋 GET /foreign-languages
     ------------------------------------------------------------
     📌 Devuelve la lista completa de lenguas extranjeras.
     ============================================================ */
  @Get(['foreign-languages', 'catalog/foreign-languages'])
  @UseInterceptors(TransformDataInterceptor)
  async getForeignLanguages(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getForeignLanguages();
  }

  /* ============================================================
     📋 GET /special-conditions
     ------------------------------------------------------------
     📌 Devuelve la lista completa de condiciones especiales.
     ============================================================ */
  @Get(['special-conditions', 'catalog/special-conditions'])
  @UseInterceptors(TransformDataInterceptor)
  async getSpecialConditions(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getSpecialConditions();
  }

  @Get(['educational-programs', 'catalog/educational-programs'])
  @UseInterceptors(TransformDataInterceptor)
  async getEducationalPrograms(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getEducationalPrograms();
  }

  @Get('school-years')
  @UseInterceptors(TransformDataInterceptor)
  async getSchoolYears(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getSchoolYears();
  }

  @Get('semesters')
  @UseInterceptors(TransformDataInterceptor)
  async getSemesters(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getSemesters();
  }

  @Get('semiannual-periods')
  @UseInterceptors(TransformDataInterceptor)
  async getSemiannualPeriods(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getSemiannualPeriods();
  }

  @Get('titles')
  @UseInterceptors(TransformDataInterceptor)
  async getTitles(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getTitles();
  }

  @Get('staff-types')
  @UseInterceptors(TransformDataInterceptor)
  async getStaffTypes(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getStaffTypes();
  }

  @Get('employment-types')
  @UseInterceptors(TransformDataInterceptor)
  async getEmploymentTypes(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getEmploymentTypes();
  }

  @Get('employment-durations')
  @UseInterceptors(TransformDataInterceptor)
  async getEmploymentDurations(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getEmploymentDurations();
  }

  @Get('responsibilities')
  @UseInterceptors(TransformDataInterceptor)
  async getResponsibilities(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getResponsibilities();
  }

  @Get('categories')
  @UseInterceptors(TransformDataInterceptor)
  async getCategories(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getCategories();
  }

  @Get('education-levels')
  @UseInterceptors(TransformDataInterceptor)
  async getEducationLevels(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getEducationLevels();
  }

  @Get('knowledge-areas')
  @UseInterceptors(TransformDataInterceptor)
  async getKnowledgeAreas(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getKnowledgeAreas();
  }

  @Get('disciplines')
  @UseInterceptors(TransformDataInterceptor)
  async getDisciplines(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getDisciplines();
  }

  @Get(['academic-disciplines', 'catalog/academic-disciplines'])
  @UseInterceptors(TransformDataInterceptor)
  async getAcademicDisciplines(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getAcademicDisciplines();
  }

  @Get(['student-generations', 'catalog/student-generations'])
  @UseInterceptors(TransformDataInterceptor)
  async getStudentGenerations(): Promise<ApiResponse<any[]>> {
    const response = await this.catalogsService.getStudentGenerations();
    if (response.success && Array.isArray(response.data)) {
      response.data = response.data.map((item: any) => ({
        ...item,
        generation: item.generationName, // Frontend compatibility
      }));
    }
    return response;
  }

  @Get(['student-statuses', 'catalog/student-statuses'])
  @UseInterceptors(TransformDataInterceptor)
  async getStudentStatuses(): Promise<ApiResponse<any[]>> {
    const response = await this.catalogsService.getStudentStatuses();
    if (response.success && Array.isArray(response.data)) {
      response.data = response.data.map((item: any) => ({
        ...item,
        status: item.description, // Frontend compatibility
        key: item.statusKey,       // Frontend compatibility
      }));
    }
    return response;
  }

  @Get(['study-plans', 'catalog/study-plans'])
  @UseInterceptors(TransformDataInterceptor)
  async getStudyPlans(
    @Query() query: QueryStudyPlanDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getStudyPlans(query);
  }

  @Get('catalog/week-days')
  @UseInterceptors(TransformDataInterceptor)
  async getWeekDays(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getWeekDays();
  }

  @Get('catalog/weekly-hours')
  @UseInterceptors(TransformDataInterceptor)
  async getWeeklyHours(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getWeeklyHours();
  }

  @Get('catalog/classrooms')
  @UseInterceptors(TransformDataInterceptor)
  async getClassrooms(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getClassrooms();
  }

  @Get('catalog/classes')
  @UseInterceptors(TransformDataInterceptor)
  async getClasses(): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getClasses();
  }

  @Get('catalog/teachers')
  @UseInterceptors(TransformDataInterceptor)
  async getTeachers(
    @Query() query: QueryTeacherDto,
  ): Promise<ApiResponse<any[]>> {
    return await this.catalogsService.getTeachers(query);
  }
}
