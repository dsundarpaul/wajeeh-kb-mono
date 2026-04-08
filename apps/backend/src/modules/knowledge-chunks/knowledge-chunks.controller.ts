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
    summary: "List knowledge chunks (optional filter by category)",
  })
  @ApiResponse({ status: 200 })
  async findAll(@Query() query: ListKnowledgeChunksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return this.knowledgeChunksService.findAll(
      query.categoryId,
      page,
      limit,
      query.type,
      query.search,
    );
  }

  @Get(":id/toc")
  @ApiOperation({ summary: "Table of contents (sections) for a knowledge chunk" })
  @ApiResponse({ status: 200 })
  async getToc(@Param("id") id: string) {
    return this.knowledgeChunksService.getTableOfContents(id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a knowledge chunk by id" })
  @ApiResponse({ status: 200 })
  async findOne(@Param("id") id: string) {
    return this.knowledgeChunksService.findOneOrFail(id);
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
  @ApiOperation({ summary: "Update a knowledge chunk (e.g. assign categories)" })
  @ApiResponse({ status: 200 })
  async update(@Param("id") id: string, @Body() dto: UpdateKnowledgeChunksDto) {
    return this.knowledgeChunksService.update(id, dto);
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
