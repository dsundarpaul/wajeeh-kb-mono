import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Types, QueryFilter } from "mongoose";
import { DatabaseService } from "../database/database.service";
import {
  KnowledgeChunkSection,
  KnowledgeChunksDocument,
  KnowledgeChunksEntity,
  KnowledgeChunksType,
  resolveCategoryIds,
} from "../database/models/knowledge-chunks.entity";
import { CreateKnowledgeChunksDto } from "./dto/create-knowledge-chunks.dto";
import { UpdateKnowledgeChunksDto } from "./dto/update-knowledge-chunks.dto";
import {
  isMongoObjectIdString,
  slugifyTitle,
} from "./knowledge-slug.util";
import { ArticleTranslationService } from "./article-translation.service";

export type PaginatedKnowledgeChunks = {
  data: Record<string, unknown>[];
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
export class KnowledgeChunksService implements OnModuleInit {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly articleTranslation: ArticleTranslationService,
  ) {}

  async onModuleInit() {
    await this.backfillMissingSlugs().catch(() => undefined);
  }

  private async allocateUniqueSlug(
    base: string,
    excludeId?: Types.ObjectId,
  ): Promise<string> {
    const root = base.length > 0 ? base : "article";
    let candidate = root;
    let suffix = 0;
    for (;;) {
      const existing = await this.databaseService.knowledgeChunksModel
        .findOne({ slug: candidate })
        .exec();
      if (
        !existing ||
        (excludeId && (existing._id as Types.ObjectId).equals(excludeId))
      ) {
        return candidate;
      }
      suffix += 1;
      candidate = `${root}-${suffix}`;
    }
  }

  private async backfillMissingSlugs(): Promise<void> {
    const cursor = this.databaseService.knowledgeChunksModel
      .find({
        $or: [
          { slug: { $exists: false } },
          { slug: null },
          { slug: "" },
        ],
      })
      .cursor();
    for await (const doc of cursor) {
      try {
        const id = doc._id as Types.ObjectId;
        const base = slugifyTitle(doc.title ?? "article");
        doc.slug = await this.allocateUniqueSlug(base, id);
        await doc.save();
      } catch {
        continue;
      }
    }
  }

  private async findDocumentByIdOrSlug(
    param: string,
  ): Promise<KnowledgeChunksDocument | null> {
    if (isMongoObjectIdString(param)) {
      const byId = await this.databaseService.knowledgeChunksModel
        .findById(param)
        .exec();
      if (byId) {
        return byId;
      }
      return this.databaseService.knowledgeChunksModel
        .findOne({ slug: param })
        .exec();
    }
    return this.databaseService.knowledgeChunksModel
      .findOne({ slug: param })
      .exec();
  }

  private categoryPlacementFilter(categoryId: Types.ObjectId) {
    return {
      $or: [{ categoryId }, { categoryIds: categoryId }],
    } as QueryFilter<KnowledgeChunksDocument>;
  }

  private stripLocales<T extends Record<string, unknown>>(row: T): Omit<T, "locales"> {
    const { locales: _l, ...rest } = row;
    return rest as Omit<T, "locales">;
  }

  private mapListRowForLocale(
    doc: KnowledgeChunksDocument,
    locale: "en" | "ar" | "ur",
  ): Record<string, unknown> {
    const plain = doc.toObject() as unknown as Record<string, unknown> & {
      locales?: {
        ar?: { title?: string; content?: string };
        ur?: { title?: string; content?: string };
      };
    };
    if (locale === "en") {
      return { ...this.stripLocales(plain), locale: "en" };
    }
    const variant = plain.locales?.[locale];
    const has =
      variant &&
      (String(variant.title ?? "").trim() ||
        String(variant.content ?? "").trim());
    const base = this.stripLocales(plain);
    return {
      ...base,
      title:
        has && String(variant!.title ?? "").trim()
          ? variant!.title
          : plain.title,
      locale: has ? locale : "en",
      titleFallback: !has,
    };
  }

  async findAll(
    categoryId?: string,
    page = 1,
    limit = 50,
    type?: KnowledgeChunksType,
    search?: string,
    listLocale: "en" | "ar" | "ur" = "en",
  ): Promise<{
    data: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
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
    const mapped = data.map((d) => this.mapListRowForLocale(d, listLocale));
    return { data: mapped, total, page, limit, totalPages };
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

  async findOneOrFail(idOrSlug: string): Promise<KnowledgeChunksDocument> {
    const doc = await this.findDocumentByIdOrSlug(idOrSlug);
    if (!doc) {
      throw new NotFoundException("Knowledge chunk not found");
    }
    return doc;
  }

  async findOneRawForAdmin(idOrSlug: string): Promise<Record<string, unknown>> {
    const doc = await this.findOneOrFail(idOrSlug);
    return doc.toObject() as unknown as Record<string, unknown>;
  }

  async findOnePublic(
    idOrSlug: string,
    locale?: string,
  ): Promise<Record<string, unknown>> {
    const doc = await this.findOneOrFail(idOrSlug);
    const loc =
      locale === "ar" || locale === "ur"
        ? locale
        : ("en" as const);
    const plain = doc.toObject() as unknown as Record<string, unknown> & {
      locales?: {
        ar?: {
          title?: string;
          content?: string;
          sections?: KnowledgeChunkSection[];
          seo?: Record<string, unknown>;
        };
        ur?: {
          title?: string;
          content?: string;
          sections?: KnowledgeChunkSection[];
          seo?: Record<string, unknown>;
        };
      };
    };
    if (loc === "en") {
      return { ...this.stripLocales(plain), locale: "en" };
    }
    const variant = plain.locales?.[loc];
    const has =
      variant &&
      (String(variant.title ?? "").trim() ||
        String(variant.content ?? "").trim());
    if (!has) {
      return {
        ...this.stripLocales(plain),
        locale: "en",
        requestedLocale: loc,
        contentFallback: true,
      };
    }
    return this.stripLocales({
      ...plain,
      title: variant!.title || plain.title,
      content: variant!.content || plain.content,
      sections:
        variant!.sections?.length ? variant!.sections : plain.sections,
      seo: { ...(plain.seo as object), ...(variant!.seo ?? {}) },
      locale: loc,
      contentFallback: false,
    });
  }

  private async translateSectionsForLocale(
    sections: KnowledgeChunkSection[],
    target: "ar" | "ur",
  ): Promise<KnowledgeChunkSection[]> {
    const out: KnowledgeChunkSection[] = [];
    for (const s of sections) {
      const title = await this.articleTranslation.translatePlain(
        s.title,
        target,
      );
      const content =
        s.content?.trim()
          ? await this.articleTranslation.translateHtml(s.content, target)
          : undefined;
      out.push({
        slug: s.slug,
        title,
        order: s.order,
        level: s.level ?? 2,
        content,
      });
    }
    return out;
  }

  async translateFromEnglish(
    id: string,
    targets: ("ar" | "ur")[],
  ): Promise<Record<string, unknown>> {
    const doc = await this.findOneOrFail(id);
    if (doc.type !== KnowledgeChunksType.BLOG) {
      throw new BadRequestException("Only blog articles support translations");
    }
    const title = doc.title;
    const content = doc.content;
    if (!title?.trim() || !content?.trim()) {
      throw new BadRequestException("English title and content are required");
    }
    for (const target of targets) {
      const [tTitle, tContent, tSeo, tSections] = await Promise.all([
        this.articleTranslation.translatePlain(title, target),
        this.articleTranslation.translateHtml(content, target),
        this.articleTranslation.translateSeo(doc.seo, target),
        this.translateSectionsForLocale(doc.sections ?? [], target),
      ]);
      doc.set(`locales.${target}`, {
        title: tTitle,
        content: tContent,
        sections: tSections,
        seo: tSeo ?? undefined,
      });
    }
    await doc.save();
    return doc.toObject() as unknown as Record<string, unknown>;
  }

  async getTableOfContents(idOrSlug: string): Promise<TableOfContentsResponse> {
    const doc = await this.findOneOrFail(idOrSlug);
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

    const {
      slug: slugInput,
      categoryId: _c,
      categoryIds: _ids,
      primaryCategoryId: _p,
      ...rest
    } = dto;
    const base =
      slugInput?.trim().length > 0
        ? slugInput.trim()
        : slugifyTitle(dto.title);
    const slug = await this.allocateUniqueSlug(base);
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
      slug,
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

  private assertNotSharedFieldsOnLocalePatch(dto: UpdateKnowledgeChunksDto) {
    if (
      dto.categoryId !== undefined ||
      dto.categoryIds !== undefined ||
      dto.primaryCategoryId !== undefined ||
      dto.tags !== undefined ||
      dto.media !== undefined ||
      dto.url !== undefined ||
      dto.type !== undefined ||
      dto.slug !== undefined
    ) {
      throw new BadRequestException(
        "Categories, tags, media, URL, type and slug can only be edited on the English version",
      );
    }
  }

  private async updateLocaleOnly(
    id: string,
    locale: "ar" | "ur",
    dto: UpdateKnowledgeChunksDto,
  ): Promise<KnowledgeChunksDocument> {
    this.assertNotSharedFieldsOnLocalePatch(dto);
    const doc = await this.databaseService.knowledgeChunksModel
      .findById(id)
      .exec();
    if (!doc) {
      throw new NotFoundException("Knowledge chunk not found");
    }
    if (!doc.locales) {
      doc.locales = {} as NonNullable<KnowledgeChunksDocument["locales"]>;
    }
    const locs = doc.locales;
    const prev = locs[locale] ?? {
      title: "",
      content: "",
      sections: [],
    };
    if (dto.title !== undefined) {
      prev.title = dto.title;
    }
    if (dto.content !== undefined) {
      prev.content = dto.content;
    }
    if (dto.sections !== undefined) {
      prev.sections = dto.sections.map((s) => ({
        slug: s.slug,
        title: s.title,
        order: s.order,
        level: s.level ?? 2,
        content: s.content,
      }));
    }
    if (dto.seo !== undefined) {
      prev.seo = { ...prev.seo, ...dto.seo };
    }
    locs[locale] = prev;
    doc.markModified("locales");
    await doc.save();
    return doc;
  }

  async update(
    id: string,
    dto: UpdateKnowledgeChunksDto,
    locale?: string,
  ): Promise<KnowledgeChunksDocument> {
    if (locale === "ar" || locale === "ur") {
      return this.updateLocaleOnly(id, locale, dto);
    }

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
    if (dto.slug !== undefined) {
      const t = dto.slug.trim();
      if (t.length === 0) {
        doc.slug = await this.allocateUniqueSlug(
          slugifyTitle(doc.title),
          doc._id as Types.ObjectId,
        );
      } else {
        doc.slug = await this.allocateUniqueSlug(t, doc._id as Types.ObjectId);
      }
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
