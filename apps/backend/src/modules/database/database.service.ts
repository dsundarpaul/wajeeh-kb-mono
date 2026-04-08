import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import config from "../../configuration";
import mongoose, { Connection, Model } from "mongoose";
import { KnowledgeChunksDocument, KnowledgeChunksEntity } from "./models/knowledge-chunks.entity";
import { KnowledgeCategory, KnowledgeCategoryDocument } from "./models/knowledge-category.entity";

@Injectable()
export class DatabaseService {
  @InjectConnection(config.databases.main.name)
  public connection: Connection;

  ObjectId(id?: string) {
    return new mongoose.Types.ObjectId(id);
  }

  @InjectModel(KnowledgeChunksEntity.name, config.databases.main.name)
  public knowledgeChunksModel: Model<KnowledgeChunksDocument>;

  @InjectModel(KnowledgeCategory.name, config.databases.main.name)
  public knowledgeCategoryModel: Model<KnowledgeCategoryDocument>;
}
