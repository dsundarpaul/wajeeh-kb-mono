import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './modules/chat/chat.module';
import { IngestModule } from './ingest/ingest.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import config from './configuration';
import { KnowledgeChunksModule } from './modules/knowledge-chunks/knowledge-chunks.module';
import { KnowledgeCategoriesModule } from './modules/knowledge-categories/knowledge-categories.module';
import { DatabaseModule } from './modules/database/database.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { StorageModule } from './modules/storage/storage.module';
import { VideosModule } from './modules/videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    MongooseModule.forRoot(config.databases.main.uri!, {
      connectionName: config.databases.main.name,
      replicaSet: config.databases.main.replicaSet,
      autoIndex: true,
    }),
    DatabaseModule,
    StorageModule,
    AuthModule,
    UploadsModule,
    KnowledgeChunksModule,
    KnowledgeCategoriesModule,
    VideosModule,
    ChatModule,
    IngestModule,
    EmbeddingsModule,
    VectorStoreModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
