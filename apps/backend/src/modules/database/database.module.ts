import { Module, OnApplicationBootstrap } from "@nestjs/common";
import { InjectConnection, MongooseModule } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import config from "../../configuration";
import { DatabaseService } from "./database.service";
import {
  KnowledgeChunksEntity,
  KnowledgeChunksSchema,
} from "./models/knowledge-chunks.entity";
import {
  KnowledgeCategory,
  KnowledgeCategorySchema,
} from "./models/knowledge-category.entity";

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: KnowledgeChunksEntity.name, schema: KnowledgeChunksSchema },
        { name: KnowledgeCategory.name, schema: KnowledgeCategorySchema },
      ],
      config.databases.main.name,
    ),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule implements OnApplicationBootstrap {
  @InjectConnection(config.databases.main.name)
  private readonly connection: Connection;

  async onApplicationBootstrap() {
    this.connection
      .syncIndexes({
        continueOnError: true,
      })
      .then((result) => {
        console.log("indexes are synced", result);
      })
      .catch((error) => {
        console.error("error syncing indexes", error);
      });
  }
}
