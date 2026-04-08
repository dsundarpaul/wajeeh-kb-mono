import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IngestService } from './ingest.service';

@ApiTags('ingest')
@Controller('ingest')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post('rebuild')
  @ApiOperation({ summary: 'Rebuild the vector index from all blogs and videos' })
  async rebuildIndex() {
    return this.ingestService.rebuildIndex();
  }
}
