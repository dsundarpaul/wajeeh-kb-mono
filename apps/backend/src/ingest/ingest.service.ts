import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { KnowledgeChunksService } from '../modules/knowledge-chunks/knowledge-chunks.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { Metadata } from '../vector-store/vector-store.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { ConfigService } from '@nestjs/config';
import { KnowledgeCategoriesService } from '../modules/knowledge-categories/knowledge-categories.service';
import {
  KnowledgeChunksDocument,
  KnowledgeChunksType,
  resolveCategoryIds,
  resolvePrimaryCategoryId,
} from '../modules/database/models/knowledge-chunks.entity';
import { DatabaseService } from '../modules/database/database.service';

@Injectable()
export class IngestService {
  constructor(
    private databaseService: DatabaseService,
    private knowledgeChunksService: KnowledgeChunksService,
    private knowledgeCategoriesService: KnowledgeCategoriesService,
    private embeddingsService: EmbeddingsService,
    private vectorStoreService: VectorStoreService,
    private configService: ConfigService,
  ) {}

  private chunkText(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    if (!text || text.length < 50) return chunks;

    let start = 0;
    while (start < text.length) {
      const end = start + size;
      const chunk = text.slice(start, end);
      if (chunk.length >= 50) {
        chunks.push(chunk);
      }
      if (end >= text.length) break;
      start = end - overlap;
    }
    return chunks;
  }

  private sectionBodies(knowledgeChunk: KnowledgeChunksDocument): {
    text: string;
    sectionId: string | null;
    headingPath: string | null;
  }[] {
    const sections = (knowledgeChunk.sections ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const withContent = sections.filter(
      (s) => (s.content?.trim().length ?? 0) > 0,
    );
    if (withContent.length === 0) {
      return [
        {
          text: knowledgeChunk.content,
          sectionId: null,
          headingPath: null,
        },
      ];
    }
    return withContent.map((s) => ({
      text: s.content!,
      sectionId:
        (s as { _id?: Types.ObjectId })._id?.toHexString() ?? null,
      headingPath: s.title,
    }));
  }

  private async buildVectorMetadata(
    knowledgeChunk: KnowledgeChunksDocument,
    sourceId: string,
    chunkIndex: number,
    chunkTextValue: string,
    sectionId: string | null,
    headingPath: string | null,
  ): Promise<Metadata> {
    const sourceType: 'blog' | 'video' =
      knowledgeChunk.type === KnowledgeChunksType.VIDEO ? 'video' : 'blog';
    const base: Metadata = {
      source_type: sourceType,
      source_id: sourceId,
      title: knowledgeChunk.title,
      url: knowledgeChunk.url,
      chunk_text: chunkTextValue,
      chunk_index: chunkIndex,
      section_id: sectionId,
      heading_path: headingPath,
    };
    const ids = resolveCategoryIds(knowledgeChunk);
    if (ids.length === 0) {
      return {
        ...base,
        category_id: null,
        category_breadcrumb: null,
        category_ids: null,
        category_breadcrumbs: null,
        category_placements: null,
      };
    }
    const placements =
      await this.knowledgeCategoriesService.getCategoryPlacementsMetadata(ids);
    const primary = resolvePrimaryCategoryId(knowledgeChunk);
    const primaryPlacement = primary
      ? placements.find((p) => p.category_id === primary.toHexString())
      : placements[0];
    return {
      ...base,
      category_id: primaryPlacement?.category_id ?? null,
      category_breadcrumb: primaryPlacement?.category_breadcrumb ?? null,
      category_ids: placements.map((p) => p.category_id),
      category_breadcrumbs: placements.map((p) => p.category_breadcrumb),
      category_placements: placements,
    };
  }

  async rebuildIndex(): Promise<{
    knowledgeChunks: number;
    total_chunks: number;
  }> {
    const knowledgeChunks = await this.knowledgeChunksService.findAllForIngest();

    const chunkSize = parseInt(
      this.configService.get<string>('CHUNK_SIZE', '500'),
    );
    const chunkOverlap = parseInt(
      this.configService.get<string>('CHUNK_OVERLAP', '50'),
    );

    const items: { embedding: number[]; metadata: Metadata }[] = [];

    for (const knowledgeChunk of knowledgeChunks) {
      const sourceId = (knowledgeChunk._id as Types.ObjectId).toHexString();
      const runs = this.sectionBodies(knowledgeChunk);
      let globalChunkIndex = 0;
      for (const run of runs) {
        const chunks = this.chunkText(run.text, chunkSize, chunkOverlap);
        for (let i = 0; i < chunks.length; i++) {
          const embedding = await this.embeddingsService.embedText(chunks[i]);
          const metadata = await this.buildVectorMetadata(
            knowledgeChunk,
            sourceId,
            globalChunkIndex,
            chunks[i],
            run.sectionId,
            run.headingPath,
          );
          items.push({ embedding, metadata });
          globalChunkIndex += 1;
        }
      }
    }

    const result = await this.vectorStoreService.buildIndex(items);

    return {
      knowledgeChunks: knowledgeChunks.length,
      total_chunks: result.total_chunks,
    };
  }
}
