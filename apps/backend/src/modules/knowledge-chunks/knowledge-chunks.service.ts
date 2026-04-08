import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Types, QueryFilter } from "mongoose";
import { DatabaseService } from "../database/database.service";
import {
  KnowledgeChunksDocument,
  KnowledgeChunksEntity,
  KnowledgeChunksType,
  resolveCategoryIds,
} from "../database/models/knowledge-chunks.entity";
import { CreateKnowledgeChunksDto } from "./dto/create-knowledge-chunks.dto";
import { UpdateKnowledgeChunksDto } from "./dto/update-knowledge-chunks.dto";

export type PaginatedKnowledgeChunks = {
  data: KnowledgeChunksDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type TableOfContentsResponse = {
  sections: {
    id: string;
    slug: string;
    title: string;
    order: number;
    level: number;
  }[];
};

@Injectable()
export class KnowledgeChunksService {
  constructor(private readonly databaseService: DatabaseService) {}

  private categoryPlacementFilter(categoryId: Types.ObjectId) {
    return {
      $or: [{ categoryId }, { categoryIds: categoryId }],
    } as QueryFilter<KnowledgeChunksDocument>;
  }

  async findAll(
    categoryId?: string,
    page = 1,
    limit = 50,
    type?: KnowledgeChunksType,
    search?: string,
  ): Promise<PaginatedKnowledgeChunks> {
    const mongoQuery: QueryFilter<KnowledgeChunksDocument> = {};

    if (categoryId) {
      const cid = new Types.ObjectId(categoryId);
      Object.assign(mongoQuery, this.categoryPlacementFilter(cid));
    }

    if (type !== undefined) {
      mongoQuery.type = type;
    }

    if (search?.trim()) {
      mongoQuery.title = { $regex: search.trim(), $options: "i" };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.databaseService.knowledgeChunksModel
        .find(mongoQuery)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.databaseService.knowledgeChunksModel.countDocuments(mongoQuery).exec(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data, total, page, limit, totalPages };
  }

  async findAllForIngest(): Promise<KnowledgeChunksDocument[]> {
    return this.databaseService.knowledgeChunksModel
      .find()
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<KnowledgeChunksDocument | null> {
    return this.databaseService.knowledgeChunksModel.findById(id).exec();
  }

  async findOneOrFail(id: string): Promise<KnowledgeChunksDocument> {
    const doc = await this.findOne(id);
    if (!doc) {
      throw new NotFoundException("Knowledge chunk not found");
    }
    return doc;
  }

  async getTableOfContents(id: string): Promise<TableOfContentsResponse> {
    const doc = await this.findOneOrFail(id);
    const list = (doc.sections ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return {
      sections: list.map((s) => ({
        id: (s as { _id?: Types.ObjectId })._id?.toHexString() ?? "",
        slug: s.slug,
        title: s.title,
        order: s.order,
        level: s.level ?? 2,
      })),
    };
  }

  private async assertCategoriesExist(ids: Types.ObjectId[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const count = await this.databaseService.knowledgeCategoryModel
      .countDocuments({ _id: { $in: ids } })
      .exec();
    if (count !== ids.length) {
      throw new NotFoundException("One or more categories not found");
    }
  }

  private normalizeCreateCategories(dto: CreateKnowledgeChunksDto): {
    categoryIds: Types.ObjectId[];
    primaryCategoryId: Types.ObjectId | null;
    categoryId: Types.ObjectId | null;
  } {
    let categoryIds: Types.ObjectId[] =
      dto.categoryIds?.map((id) => new Types.ObjectId(id)) ?? [];
    if (categoryIds.length === 0 && dto.categoryId) {
      categoryIds = [new Types.ObjectId(dto.categoryId)];
    }
    if (dto.primaryCategoryId && categoryIds.length === 0) {
      throw new BadRequestException(
        "primaryCategoryId requires at least one category (categoryIds or categoryId)",
      );
    }
    let primaryCategoryId: Types.ObjectId | null = dto.primaryCategoryId
      ? new Types.ObjectId(dto.primaryCategoryId)
      : null;
    if (primaryCategoryId && !categoryIds.some((id) => id.equals(primaryCategoryId!))) {
      throw new BadRequestException(
        "primaryCategoryId must be one of the listed categoryIds",
      );
    }
    if (!primaryCategoryId && categoryIds.length > 0) {
      primaryCategoryId = categoryIds[0];
    }
    const categoryId = primaryCategoryId;
    return { categoryIds, primaryCategoryId, categoryId };
  }

  async create(dto: CreateKnowledgeChunksDto): Promise<KnowledgeChunksEntity> {
    const { categoryIds, primaryCategoryId, categoryId } =
      this.normalizeCreateCategories(dto);
    await this.assertCategoriesExist(categoryIds);

    const { categoryId: _c, categoryIds: _ids, primaryCategoryId: _p, ...rest } =
      dto;
    const sections = (dto.sections ?? []).map((s) => ({
      slug: s.slug,
      title: s.title,
      order: s.order,
      level: s.level ?? 2,
      content: s.content,
    }));
    const media = (dto.media ?? []).map((m, i) => ({
      type: m.type,
      url: m.url,
      alt: m.alt,
      videoId: m.videoId,
      order: m.order ?? i,
    }));

    return this.databaseService.knowledgeChunksModel.create({
      ...rest,
      categoryIds,
      primaryCategoryId,
      categoryId,
      sections,
      media,
    });
  }

  private mergeCategoryPatch(
    doc: KnowledgeChunksDocument,
    dto: UpdateKnowledgeChunksDto,
  ): { categoryIds: Types.ObjectId[]; primaryCategoryId: Types.ObjectId | null } {
    let categoryIds = resolveCategoryIds(doc);
    let primaryCategoryId = doc.primaryCategoryId ?? null;

    if (dto.categoryIds !== undefined) {
      categoryIds = dto.categoryIds.map((id) => new Types.ObjectId(id));
    } else if (dto.categoryId !== undefined) {
      if (dto.categoryId === null) {
        categoryIds = [];
      } else {
        categoryIds = [new Types.ObjectId(dto.categoryId)];
      }
    }

    if (categoryIds.length === 0) {
      primaryCategoryId = null;
    } else if (dto.primaryCategoryId !== undefined) {
      if (dto.primaryCategoryId === null) {
        primaryCategoryId = categoryIds[0];
      } else {
        primaryCategoryId = new Types.ObjectId(dto.primaryCategoryId);
        if (!categoryIds.some((id) => id.equals(primaryCategoryId!))) {
          throw new BadRequestException(
            "primaryCategoryId must be one of the listed categoryIds",
          );
        }
      }
    } else if (
      !primaryCategoryId ||
      !categoryIds.some((id) => id.equals(primaryCategoryId))
    ) {
      primaryCategoryId = categoryIds[0];
    }

    return { categoryIds, primaryCategoryId };
  }

  async update(
    id: string,
    dto: UpdateKnowledgeChunksDto,
  ): Promise<KnowledgeChunksDocument> {
    const doc = await this.databaseService.knowledgeChunksModel
      .findById(id)
      .exec();
    if (!doc) {
      throw new NotFoundException("Knowledge chunk not found");
    }

    if (
      dto.categoryIds !== undefined ||
      dto.categoryId !== undefined ||
      dto.primaryCategoryId !== undefined
    ) {
      const merged = this.mergeCategoryPatch(doc, dto);
      await this.assertCategoriesExist(merged.categoryIds);
      doc.categoryIds = merged.categoryIds;
      doc.primaryCategoryId = merged.primaryCategoryId;
      doc.categoryId = merged.primaryCategoryId;
    }

    if (dto.title !== undefined) {
      doc.title = dto.title;
    }
    if (dto.url !== undefined) {
      doc.url = dto.url;
    }
    if (dto.content !== undefined) {
      doc.content = dto.content;
    }
    if (dto.tags !== undefined) {
      doc.tags = dto.tags;
    }
    if (dto.type !== undefined) {
      doc.type = dto.type;
    }
    if (dto.sections !== undefined) {
      doc.sections = dto.sections.map((s) => ({
        slug: s.slug,
        title: s.title,
        order: s.order,
        level: s.level ?? 2,
        content: s.content,
      }));
    }
    if (dto.media !== undefined) {
      doc.media = dto.media.map((m, i) => ({
        type: m.type,
        url: m.url,
        alt: m.alt,
        videoId: m.videoId,
        order: m.order ?? i,
      }));
    }
    if (dto.seo !== undefined) {
      doc.seo = {
        ...doc.seo,
        ...dto.seo,
      };
    }

    await doc.save();
    return doc;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const doc = await this.findOneOrFail(id);
    await this.databaseService.knowledgeChunksModel.deleteOne({
      _id: doc._id,
    });
    return { deleted: true };
  }
}
