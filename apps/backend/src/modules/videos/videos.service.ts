import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import * as ytdl from "ytdl-core";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Video, VideoDocument } from "./schemas/video.schema";
import config from "../../configuration";
import { PatchVideoDto } from "./dto/patch-video.dto";

@Injectable()
export class VideosService implements OnModuleInit {
  private genAI!: GoogleGenerativeAI;
  private geminiModel!: string;
  private maxWords!: number;

  constructor(
    @InjectModel(Video.name, config.databases.main.name)
    private readonly videoModel: Model<VideoDocument>,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY") ?? "";
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.geminiModel =
      this.configService.get<string>("GEMINI_MODEL") ?? "gemini-2.5-flash";
    this.maxWords = parseInt(
      this.configService.get<string>("VIDEO_SUMMARY_MAX_WORDS") ?? "3000",
      10,
    );
  }

  async findAll(): Promise<VideoDocument[]> {
    return this.videoModel.find().sort({ created_at: -1 }).exec();
  }

  async findOne(id: string): Promise<VideoDocument | null> {
    return this.videoModel.findById(id).exec();
  }

  async findByVideoId(videoId: string): Promise<VideoDocument | null> {
    return this.videoModel.findOne({ video_id: videoId }).exec();
  }

  async create(videoData: {
    youtube_url: string;
    video_id: string;
    title: string;
    channel: string;
    thumbnail_url: string;
    transcript_raw: string;
    transcript_word_count: number;
    summary: string;
    was_summarized: boolean;
    tags: string[];
  }): Promise<VideoDocument> {
    const doc = new this.videoModel(videoData);
    return doc.save();
  }

  async update(
    id: string,
    dto: PatchVideoDto,
  ): Promise<VideoDocument | null> {
    const doc = await this.videoModel.findById(id).exec();
    if (!doc) {
      return null;
    }
    if (dto.title !== undefined) {
      doc.title = dto.title;
    }
    if (dto.tags !== undefined) {
      doc.tags = dto.tags;
    }
    return doc.save();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.videoModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  extractVideoId(url: string): string {
    const pattern =
      /(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(pattern);
    if (!match) {
      throw new HttpException(
        "Invalid YouTube URL — could not extract video ID",
        HttpStatus.BAD_REQUEST,
      );
    }
    return match[1];
  }

  async getMetadata(videoId: string): Promise<{
    title: string;
    channel: string;
    thumbnail_url: string;
  }> {
    try {
      const info = await ytdl.getBasicInfo(
        `https://www.youtube.com/watch?v=${videoId}`,
      );
      return {
        title: info.videoDetails.title || `YouTube Video (${videoId})`,
        channel: info.videoDetails.author.name || "Unknown",
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      };
    } catch {
      return {
        title: `YouTube Video (${videoId})`,
        channel: "Unknown",
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
  }

  async getTranscript(
    videoId: string,
  ): Promise<{ text: string; wordCount: number }> {
    try {
      const { YoutubeTranscript } = await import("youtube-transcript");
      const transcriptItems = await YoutubeTranscript.fetchTranscript(
        videoId,
      );
      let text = transcriptItems.map((item) => item.text).join(" ");
      text = text
        .replace(/\[Music\]/g, "")
        .replace(/\[Applause\]/g, "")
        .replace(/\[Laughter\]/g, "")
        .replace(/\n+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (wordCount < 10) {
        throw new Error("Transcript too short");
      }
      return { text, wordCount };
    } catch {
      throw new HttpException(
        "This video has no available transcript. Only videos with captions/subtitles can be added.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async summarizeTranscript(
    transcript: string,
    title: string,
  ): Promise<string> {
    const prompt = `You are an expert content summarizer. Your task is to create a comprehensive, detailed summary of a YouTube video transcript.

Video Title: ${title}

Full Transcript:
${transcript}

Create a detailed summary that includes:
1. **Main Topic**: What is this video fundamentally about?
2. **Key Points**: List all major points covered (be thorough, include 8-15 bullet points)
3. **Important Details**: Specific facts, statistics, examples, code snippets, or techniques mentioned
4. **Concepts Explained**: Any technical concepts, terms, or frameworks introduced
5. **Practical Takeaways**: What can a viewer actually do or apply after watching this?
6. **Conclusions**: What conclusions or recommendations does the video make?

Write the summary in flowing paragraphs under each heading. Be detailed enough that someone who hasn't watched the video would fully understand all the content. Preserve technical accuracy — do not simplify or omit technical details.`;
    const model = this.genAI.getGenerativeModel({ model: this.geminiModel });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        if (attempt === 2) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    return transcript;
  }

  private async buildStoredPayload(
    videoId: string,
    transcriptText: string,
    wordCount: number,
    tags: string[] | undefined,
  ) {
    const metadata = await this.getMetadata(videoId);
    const maxWords = this.maxWords;
    let summary: string;
    let wasSummarized = false;
    if (wordCount > maxWords) {
      summary = await this.summarizeTranscript(transcriptText, metadata.title);
      wasSummarized = true;
    } else {
      summary = transcriptText;
    }
    return {
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      video_id: videoId,
      title: metadata.title,
      channel: metadata.channel,
      thumbnail_url: metadata.thumbnail_url,
      transcript_raw: transcriptText,
      transcript_word_count: wordCount,
      summary,
      was_summarized: wasSummarized,
      tags: tags ?? [],
    };
  }

  async addFromYoutubeUrl(youtubeUrl: string, tags?: string[]) {
    const videoId = this.extractVideoId(youtubeUrl);
    const existing = await this.findByVideoId(videoId);
    if (existing) {
      throw new HttpException(
        "This video has already been added.",
        HttpStatus.CONFLICT,
      );
    }
    const { text: transcriptText, wordCount } =
      await this.getTranscript(videoId);
    const payload = await this.buildStoredPayload(
      videoId,
      transcriptText,
      wordCount,
      tags,
    );
    return this.create(payload);
  }

  async addManual(
    youtubeUrl: string,
    transcriptRaw: string,
    tags?: string[],
  ) {
    const videoId = this.extractVideoId(youtubeUrl);
    const existing = await this.findByVideoId(videoId);
    if (existing) {
      throw new HttpException(
        "This video has already been added.",
        HttpStatus.CONFLICT,
      );
    }
    const transcriptText = transcriptRaw.trim();
    const wordCount = transcriptText.split(/\s+/).filter(Boolean).length;
    const payload = await this.buildStoredPayload(
      videoId,
      transcriptText,
      wordCount,
      tags,
    );
    return this.create(payload);
  }
}
