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
import { CreateKnowledgeChunksDto } from "./dto/create-knowledge-chunks.dto";
import { UpdateKnowledgeChunksDto } from "./dto/update-knowledge-chunks.dto";
import { ListKnowledgeChunksQueryDto } from "./dto/list-knowledge-chunks-query.dto";
import { TranslateArticleDto } from "./dto/translate-article.dto";
import { KnowledgeChunksService } from "./knowledge-chunks.service";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

@Controller("knowledge-chunks")
export class KnowledgeChunksController {
  constructor(
    private readonly knowledgeChunksService: KnowledgeChunksService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List knowledge chunks (optional filter by category, locale)",
  })
  @ApiResponse({ status: 200 })
  async findAll(@Query() query: ListKnowledgeChunksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const listLocale = query.locale ?? "en";
    return this.knowledgeChunksService.findAll(
      query.categoryId,
      page,
      limit,
      query.type,
      query.search,
      listLocale,
    );
  }

  @Get(":id/admin")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Full article for panel editor (includes all locale variants)",
  })
  @ApiResponse({ status: 200 })
  async findOneAdmin(@Param("id") id: string) {
    return this.knowledgeChunksService.findOneRawForAdmin(id);
  }

  @Post(":id/translate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Translate English article to Arabic and/or Urdu (Gemini)",
  })
  @ApiResponse({ status: 200 })
  async translate(
    @Param("id") id: string,
    @Body() dto: TranslateArticleDto,
  ) {
    return this.knowledgeChunksService.translateFromEnglish(id, dto.targets);
  }

  @Get(":id/toc")
  @ApiOperation({
    summary:
      "Table of contents (sections) for a knowledge chunk (id or URL slug)",
  })
  @ApiResponse({ status: 200 })
  async getToc(@Param("id") id: string) {
    return this.knowledgeChunksService.getTableOfContents(id);
  }

  @Get(":id")
  @ApiOperation({
    summary:
      "Get a knowledge chunk by Mongo id or URL slug (?locale=en|ar|ur, omits raw locales)",
  })
  @ApiResponse({ status: 200 })
  async findOne(
    @Param("id") id: string,
    @Query("locale") locale?: string,
  ) {
    return this.knowledgeChunksService.findOnePublic(id, locale);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a knowledge chunk" })
  @ApiResponse({ status: 201 })
  async create(@Body() createKnowledgeChunksDto: CreateKnowledgeChunksDto) {
    return this.knowledgeChunksService.create(createKnowledgeChunksDto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update a knowledge chunk. Use ?locale=ar|ur to edit that translation only.",
  })
  @ApiResponse({ status: 200 })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateKnowledgeChunksDto,
    @Query("locale") locale?: string,
  ) {
    return this.knowledgeChunksService.update(id, dto, locale);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a knowledge chunk" })
  @ApiResponse({ status: 200 })
  async remove(@Param("id") id: string) {
    return this.knowledgeChunksService.delete(id);
  }
}
