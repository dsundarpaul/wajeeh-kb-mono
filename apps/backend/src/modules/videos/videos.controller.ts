import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { VideosService } from "./videos.service";
import { VideoCreateDto } from "./dto/video-create.dto";
import { VideoManualCreateDto } from "./dto/video-manual-create.dto";
import { PatchVideoDto } from "./dto/patch-video.dto";

@ApiTags("videos")
@Controller("videos")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  @ApiOperation({ summary: "Get all videos" })
  async getVideos() {
    return this.videosService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one video" })
  async getVideo(@Param("id") id: string) {
    const doc = await this.videosService.findOne(id);
    if (!doc) {
      throw new HttpException("Video not found", HttpStatus.NOT_FOUND);
    }
    return doc;
  }

  @Post()
  @ApiOperation({ summary: "Add a new video (auto transcript from YouTube)" })
  async addVideo(@Body() payload: VideoCreateDto) {
    return this.videosService.addFromYoutubeUrl(
      payload.youtube_url,
      payload.tags,
    );
  }

  @Post("manual")
  @ApiOperation({ summary: "Add a video with a pasted transcript" })
  async addVideoManual(@Body() payload: VideoManualCreateDto) {
    return this.videosService.addManual(
      payload.youtube_url,
      payload.transcript_raw,
      payload.tags,
    );
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update video title and/or tags" })
  async patchVideo(@Param("id") id: string, @Body() dto: PatchVideoDto) {
    const updated = await this.videosService.update(id, dto);
    if (!updated) {
      throw new HttpException("Video not found", HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a video" })
  async deleteVideo(@Param("id") id: string) {
    const deleted = await this.videosService.delete(id);
    if (!deleted) {
      throw new HttpException("Video not found", HttpStatus.NOT_FOUND);
    }
    return { deleted: true };
  }
}
