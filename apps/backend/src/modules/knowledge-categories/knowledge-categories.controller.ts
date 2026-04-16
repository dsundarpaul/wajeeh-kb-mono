import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { KnowledgeCategoriesService } from "./knowledge-categories.service";
import { CreateKnowledgeCategoryDto } from "./dto/create-knowledge-category.dto";
import { UpdateKnowledgeCategoryDto } from "./dto/update-knowledge-category.dto";
import { PaginatedChunksQueryDto } from "./dto/paginated-chunks-query.dto";
import { CategoryTreeQueryDto } from "./dto/category-tree-query.dto";
import { TranslateCategoryFieldsDto } from "./dto/translate-category-fields.dto";

@Controller("categories")
export class KnowledgeCategoriesController {
  constructor(
    private readonly knowledgeCategoriesService: KnowledgeCategoriesService,
  ) {}

  @Get("tree")
  @ApiOperation({
    summary:
      "Nested category tree. Optional locale + articleCounts for public KB portal.",
  })
  @ApiResponse({ status: 200 })
  findTree(@Query() query: CategoryTreeQueryDto) {
    return this.knowledgeCategoriesService.findTree({
      locale: query.locale,
      includeArticleCounts: query.articleCounts === true,
    });
  }

  @Get(":id/chunks")
  @ApiOperation({ summary: "Knowledge chunks in this category (direct members only)" })
  @ApiResponse({ status: 200 })
  findChunksByCategory(
    @Param("id") id: string,
    @Query() query: PaginatedChunksQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const locale = query.locale ?? "en";
    return this.knowledgeCategoriesService.findChunksByCategory(
      id,
      page,
      limit,
      locale,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get category by id" })
  @ApiResponse({ status: 200 })
  findOne(@Param("id") id: string) {
    return this.knowledgeCategoriesService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: "Flat list of all categories" })
  @ApiResponse({ status: 200 })
  findAllFlat() {
    return this.knowledgeCategoriesService.findAllFlat();
  }

  @Post("translate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Translate English name/description to Arabic and/or Urdu",
  })
  @ApiResponse({ status: 200 })
  translateFields(@Body() dto: TranslateCategoryFieldsDto) {
    return this.knowledgeCategoriesService.translateFieldsFromEnglish(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create category" })
  @ApiResponse({ status: 201 })
  create(@Body() dto: CreateKnowledgeCategoryDto) {
    return this.knowledgeCategoriesService.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update category (including reparent)" })
  @ApiResponse({ status: 200 })
  update(@Param("id") id: string, @Body() dto: UpdateKnowledgeCategoryDto) {
    return this.knowledgeCategoriesService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete category (no children, no chunks)" })
  @ApiResponse({ status: 200 })
  remove(@Param("id") id: string) {
    return this.knowledgeCategoriesService.remove(id);
  }
}
