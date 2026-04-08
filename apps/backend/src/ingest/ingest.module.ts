import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IngestController } from './ingest.controller';
import { IngestService } from './ingest.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { KnowledgeChunksModule } from '../modules/knowledge-chunks/knowledge-chunks.module';
import { KnowledgeCategoriesModule } from '../modules/knowledge-categories/knowledge-categories.module';
import { DatabaseModule } from '../modules/database/database.module';

@Module({
  imports: [
    AuthModule,
    KnowledgeChunksModule,
    KnowledgeCategoriesModule,
    EmbeddingsModule,
    VectorStoreModule,
    DatabaseModule,
  ],
  controllers: [IngestController],
  providers: [IngestService],
})
export class IngestModule {}
