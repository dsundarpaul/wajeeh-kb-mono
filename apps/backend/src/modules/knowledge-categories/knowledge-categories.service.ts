import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { DatabaseService } from "../database/database.service";
import { KnowledgeChunksService } from "../knowledge-chunks/knowledge-chunks.service";
import { ArticleTranslationService } from "../knowledge-chunks/article-translation.service";
import {
  KnowledgeCategory,
  KnowledgeCategoryDocument,
} from "../database/models/knowledge-category.entity";
import { CreateKnowledgeCategoryDto } from "./dto/create-knowledge-category.dto";
import { UpdateKnowledgeCategoryDto } from "./dto/update-knowledge-category.dto";
import { TranslateCategoryFieldsDto } from "./dto/translate-category-fields.dto";
import { CategoryPlacementMeta } from "../../vector-store/vector-store.service";

export type CategoryTreeNode = KnowledgeCategory & {
  _id: Types.ObjectId;
  children: CategoryTreeNode[];
};

export type PublicCategoryTreeNode = Omit<
  KnowledgeCategory,
  "locales" | "_id"
> & {
  _id: string;
  articleCount?: number;
  children: PublicCategoryTreeNode[];
};

@Injectable()
export class KnowledgeCategoriesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly knowledgeChunksService: KnowledgeChunksService,
    private readonly articleTranslation: ArticleTranslationService,
  ) {}

  private get model() {
    return this.databaseService.knowledgeCategoryModel;
  }

  private chunkReferencesCategory(categoryId: Types.ObjectId) {
    return {
      $or: [{ categoryId }, { categoryIds: categoryId }],
    };
  }

  async create(dto: CreateKnowledgeCategoryDto): Promise<KnowledgeCategory> {
    let parentId: Types.ObjectId | null = null;
    let ancestorIds: Types.ObjectId[] = [];
    if (dto.parentId) {
      parentId = new Types.ObjectId(dto.parentId);
      const parent = await this.model.findById(parentId).exec();
      if (!parent) {
        throw new NotFoundException("Parent category not found");
      }
      ancestorIds = [...parent.ancestorIds, parent._id as Types.ObjectId];
    }
    return this.model.create({
      name: dto.name,
      slug: dto.slug,
      order: dto.order ?? 0,
      description: dto.description,
      parentId,
      ancestorIds,
      locales: dto.locales,
    });
  }

  async findAllFlat(): Promise<KnowledgeCategory[]> {
    return this.model
      .find()
      .sort({ parentId: 1, order: 1, name: 1 })
      .exec();
  }

  private async buildCategoryTree(): Promise<CategoryTreeNode[]> {
    const all = (await this.findAllFlat()) as KnowledgeCategoryDocument[];
    const map = new Map<string, CategoryTreeNode>();
    for (const c of all) {
      const id = (c._id as Types.ObjectId).toHexString();
      const plain = c.toObject();
      map.set(id, {
        ...plain,
        _id: c._id as Types.ObjectId,
        children: [],
      } as CategoryTreeNode);
    }
    const roots: CategoryTreeNode[] = [];
    for (const c of all) {
      const id = (c._id as Types.ObjectId).toHexString();
      const node = map.get(id)!;
      const pid = c.parentId;
      if (!pid) {
        roots.push(node);
      } else {
        const parentKey = (pid as Types.ObjectId).toHexString();
        const parent = map.get(parentKey);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      }
    }
    const sortNested = (nodes: CategoryTreeNode[]) => {
      nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      for (const n of nodes) {
        if (n.children?.length) {
          sortNested(n.children);
        }
      }
    };
    sortNested(roots);
    return roots;
  }

  private async computeDirectArticleCountsByCategoryId(): Promise<
    Map<string, number>
  > {
    const rows = await this.databaseService.knowledgeChunksModel
      .find({})
      .select({ categoryId: 1, categoryIds: 1 })
      .lean()
      .exec();
    const counts = new Map<string, number>();
    for (const row of rows) {
      const r = row as {
        categoryId?: Types.ObjectId | null;
        categoryIds?: Types.ObjectId[];
      };
      const ids = new Set<string>();
      if (r.categoryId) {
        ids.add((r.categoryId as Types.ObjectId).toHexString());
      }
      for (const x of r.categoryIds ?? []) {
        ids.add((x as Types.ObjectId).toHexString());
      }
      for (const id of ids) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return counts;
  }

  private mapCategoryNodeForLocale(
    node: CategoryTreeNode,
    locale: "en" | "ar" | "ur",
  ): Omit<KnowledgeCategory, "locales"> & {
    _id: string;
    children: unknown[];
  } {
    const id = (node._id as Types.ObjectId).toHexString();
    if (locale === "en") {
      const { locales: _l, ...rest } = node as unknown as KnowledgeCategory & {
        locales?: unknown;
        children: CategoryTreeNode[];
      };
      return {
        ...rest,
        _id: id,
        children: [],
      };
    }
    const plain = node as unknown as {
      name: string;
      description?: string;
      locales?: {
        ar?: { name?: string; description?: string };
        ur?: { name?: string; description?: string };
      };
    };
    const variant = plain.locales?.[locale];
    const hasName = variant?.name?.trim();
    const hasDesc = variant?.description?.trim();
    const { locales: _l2, ...base } = node as unknown as KnowledgeCategory & {
      locales?: unknown;
      children: CategoryTreeNode[];
    };
    return {
      ...base,
      _id: id,
      name: hasName ? variant!.name!.trim() : plain.name,
      description: hasDesc ? variant!.description!.trim() : base.description,
      children: [],
    };
  }

  private serializePublicCategoryTree(
    nodes: CategoryTreeNode[],
    locale: "en" | "ar" | "ur",
    counts: Map<string, number> | null,
  ): PublicCategoryTreeNode[] {
    return nodes.map((n) => {
      const mapped = this.mapCategoryNodeForLocale(n, locale);
      const id = mapped._id;
      const children = this.serializePublicCategoryTree(
        n.children ?? [],
        locale,
        counts,
      );
      const out: PublicCategoryTreeNode = {
        ...(mapped as unknown as KnowledgeCategory),
        _id: id,
        children,
      };
      if (counts) {
        out.articleCount = counts.get(id) ?? 0;
      }
      return out;
    });
  }

  async findTree(options?: {
    locale?: "en" | "ar" | "ur";
    includeArticleCounts?: boolean;
  }): Promise<CategoryTreeNode[] | PublicCategoryTreeNode[]> {
    const roots = await this.buildCategoryTree();
    const publicResponse =
      options?.includeArticleCounts === true || options?.locale !== undefined;
    if (!publicResponse) {
      return roots;
    }
    const locale = options?.locale ?? "en";
    const counts = options?.includeArticleCounts
      ? await this.computeDirectArticleCountsByCategoryId()
      : null;
    return this.serializePublicCategoryTree(roots, locale, counts);
  }

  async findOne(id: string): Promise<KnowledgeCategory> {
    const doc = await this.model.findById(id).exec();
    if (!doc) {
      throw new NotFoundException("Category not found");
    }
    return doc;
  }

  private async wouldMoveCreateCycle(
    movingNodeId: Types.ObjectId,
    newParentId: Types.ObjectId,
  ): Promise<boolean> {
    if (newParentId.equals(movingNodeId)) {
      return true;
    }
    const newParent = await this.model.findById(newParentId).exec();
    if (!newParent) {
      return false;
    }
    return newParent.ancestorIds.some((a) => a.equals(movingNodeId));
  }

  private async recomputeDescendantsFrom(parentId: Types.ObjectId): Promise<void> {
    const children = await this.model
      .find({ parentId })
      .sort({ order: 1, name: 1 })
      .exec();
    const parent = await this.model.findById(parentId).exec();
    if (!parent) {
      return;
    }
    const parentAncestors = parent.ancestorIds;
    const parentOid = parent._id as Types.ObjectId;
    for (const child of children) {
      child.ancestorIds = [...parentAncestors, parentOid];
      await child.save();
      await this.recomputeDescendantsFrom(child._id as Types.ObjectId);
    }
  }

  private applyScalarPatch(
    node: KnowledgeCategoryDocument,
    dto: UpdateKnowledgeCategoryDto,
  ): void {
    if (dto.name !== undefined) {
      node.name = dto.name;
    }
    if (dto.slug !== undefined) {
      node.slug = dto.slug;
    }
    if (dto.order !== undefined) {
      node.order = dto.order;
    }
    if (dto.description !== undefined) {
      node.description = dto.description;
    }
    if (dto.locales !== undefined) {
      const prev = (node.locales ?? {}) as Record<string, unknown>;
      const next = { ...prev };
      if (dto.locales.ar !== undefined) {
        next.ar = { ...(prev.ar as object), ...dto.locales.ar };
      }
      if (dto.locales.ur !== undefined) {
        next.ur = { ...(prev.ur as object), ...dto.locales.ur };
      }
      node.locales = next as KnowledgeCategory["locales"];
      node.markModified("locales");
    }
  }

  private async applyReparentIfChanged(
    node: KnowledgeCategoryDocument,
    dto: UpdateKnowledgeCategoryDto,
  ): Promise<boolean> {
    if (dto.parentId === undefined) {
      return false;
    }
    const targetParent =
      dto.parentId === null ? null : new Types.ObjectId(dto.parentId);
    const currentParent = node.parentId as Types.ObjectId | null;
    const sameParent =
      (targetParent === null && !currentParent) ||
      (!!targetParent &&
        !!currentParent &&
        targetParent.equals(currentParent));
    if (sameParent) {
      return false;
    }
    if (targetParent) {
      if (targetParent.equals(node._id as Types.ObjectId)) {
        throw new BadRequestException("Category cannot be its own parent");
      }
      const cycle = await this.wouldMoveCreateCycle(
        node._id as Types.ObjectId,
        targetParent,
      );
      if (cycle) {
        throw new BadRequestException(
          "Cannot move category under its own descendant",
        );
      }
      const parent = await this.model.findById(targetParent).exec();
      if (!parent) {
        throw new NotFoundException("New parent category not found");
      }
      node.parentId = targetParent;
      node.ancestorIds = [
        ...parent.ancestorIds,
        parent._id as Types.ObjectId,
      ];
    } else {
      node.parentId = null;
      node.ancestorIds = [];
    }
    return true;
  }

  async update(
    id: string,
    dto: UpdateKnowledgeCategoryDto,
  ): Promise<KnowledgeCategory> {
    const node = await this.model.findById(id).exec();
    if (!node) {
      throw new NotFoundException("Category not found");
    }
    const moved = await this.applyReparentIfChanged(node, dto);
    this.applyScalarPatch(node, dto);
    await node.save();
    if (moved) {
      await this.recomputeDescendantsFrom(node._id as Types.ObjectId);
    }
    const updated = await this.model.findById(id).exec();
    if (!updated) {
      throw new NotFoundException("Category not found");
    }
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const node = await this.model.findById(id).exec();
    if (!node) {
      throw new NotFoundException("Category not found");
    }
    const childCount = await this.model.countDocuments({
      parentId: node._id,
    });
    if (childCount > 0) {
      throw new BadRequestException(
        "Cannot delete category that has subcategories",
      );
    }
    const chunkCount = await this.databaseService.knowledgeChunksModel
      .countDocuments(this.chunkReferencesCategory(node._id as Types.ObjectId))
      .exec();
    if (chunkCount > 0) {
      throw new BadRequestException(
        "Cannot delete category that has knowledge chunks; move or reassign them first",
      );
    }
    await this.model.deleteOne({ _id: node._id });
    return { deleted: true };
  }

  async getBreadcrumbLabel(
    categoryId: Types.ObjectId | null | undefined,
  ): Promise<string | null> {
    if (!categoryId) {
      return null;
    }
    const cat = await this.model.findById(categoryId).exec();
    if (!cat) {
      return null;
    }
    const orderedIds = [...cat.ancestorIds, cat._id as Types.ObjectId];
    const docs = await this.model
      .find({ _id: { $in: orderedIds } })
      .exec();
    const byId = new Map(
      docs.map((d) => [(d._id as Types.ObjectId).toHexString(), d]),
    );
    const names = orderedIds
      .map((oid) => byId.get(oid.toHexString())?.name)
      .filter((n): n is string => !!n);
    return names.length ? names.join(" > ") : null;
  }

  async getCategoryPlacementsMetadata(
    ids: Types.ObjectId[],
  ): Promise<CategoryPlacementMeta[]> {
    const out: CategoryPlacementMeta[] = [];
    for (const id of ids) {
      const bc = await this.getBreadcrumbLabel(id);
      out.push({
        category_id: id.toHexString(),
        category_breadcrumb: bc,
      });
    }
    return out;
  }

  async findChunksByCategory(
    categoryId: string,
    page = 1,
    limit = 20,
    locale: "en" | "ar" | "ur" = "en",
  ): Promise<{
    data: unknown[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const cat = await this.model.findById(categoryId).exec();
    if (!cat) {
      throw new NotFoundException("Category not found");
    }
    return this.knowledgeChunksService.findAll(
      categoryId,
      page,
      limit,
      undefined,
      undefined,
      locale,
    );
  }

  async translateFieldsFromEnglish(dto: TranslateCategoryFieldsDto): Promise<{
    locales: {
      ar?: { name?: string; description?: string };
      ur?: { name?: string; description?: string };
    };
  }> {
    const nameSrc = dto.name?.trim() ?? "";
    const descSrc = dto.description?.trim() ?? "";
    if (!nameSrc && !descSrc) {
      throw new BadRequestException(
        "Provide English name and/or description to translate",
      );
    }
    const locales: {
      ar?: { name?: string; description?: string };
      ur?: { name?: string; description?: string };
    } = {};
    for (const target of dto.targets) {
      const entry: { name?: string; description?: string } = {};
      if (nameSrc) {
        entry.name = await this.articleTranslation.translatePlain(
          nameSrc,
          target,
        );
      }
      if (descSrc) {
        entry.description = await this.articleTranslation.translatePlain(
          descSrc,
          target,
        );
      }
      if (Object.keys(entry).length) {
        locales[target] = entry;
      }
    }
    return { locales };
  }
}
