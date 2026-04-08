import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { KnowledgeCategoriesController } from "./knowledge-categories.controller";
import { KnowledgeCategoriesService } from "./knowledge-categories.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [KnowledgeCategoriesController],
  providers: [KnowledgeCategoriesService],
  exports: [KnowledgeCategoriesService],
})
export class KnowledgeCategoriesModule {}
