import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private genAI: GoogleGenerativeAI;
  private embeddingModel: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.embeddingModel = this.configService.get<string>('EMBEDDING_MODEL', 'models/embedding-001');
  }

  async embedText(text: string): Promise<number[]> {
    return this.embedWithRetry(text, TaskType.RETRIEVAL_DOCUMENT);
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embedWithRetry(text, TaskType.RETRIEVAL_QUERY);
  }

  private async embedWithRetry(text: string, taskType: TaskType, attempts = 3): Promise<number[]> {
    for (let i = 0; i < attempts; i++) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
        const result = await model.embedContent({
          content: { role: 'user', parts: [{ text }] },
          taskType,
        });
        return result.embedding.values;
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    return [];
  }
}
