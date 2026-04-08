import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { KnowledgeChunksController } from "./knowledge-chunks.controller";
import { KnowledgeChunksService } from "./knowledge-chunks.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [KnowledgeChunksController],
  providers: [KnowledgeChunksService],
  exports: [KnowledgeChunksService],
})
export class KnowledgeChunksModule {}