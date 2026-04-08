import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import config from "../../configuration";
import { Video, VideoSchema } from "./schemas/video.schema";
import { VideosController } from "./videos.controller";
import { VideosService } from "./videos.service";

@Module({
  imports: [
    MongooseModule.forFeature(
      [{ name: Video.name, schema: VideoSchema }],
      config.databases.main.name,
    ),
  ],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
