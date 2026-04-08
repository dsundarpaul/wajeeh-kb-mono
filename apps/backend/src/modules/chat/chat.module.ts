import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { EmbeddingsModule } from '../../embeddings/embeddings.module';
import { VectorStoreModule } from '../../vector-store/vector-store.module';

@Module({
  imports: [EmbeddingsModule, VectorStoreModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
