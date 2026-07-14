import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@ApiTags('演示')
@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('init')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('Bearer')
  @ApiOperation({ summary: '初始化分片上传' })
  initUpload(@Body() body: any) {
    return this.uploadService.initUpload(body);
  }

  @Post('chunk')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('Bearer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传分片' })
  @UseInterceptors(FileInterceptor('chunk'))
  uploadChunk(
    @Body('uploadId') uploadId: string,
    @Body('chunkIndex') chunkIndex: string,
    @Body('hash') hash: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadService.uploadChunk(uploadId, parseInt(chunkIndex, 10), hash, file);
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('Bearer')
  @ApiOperation({ summary: '完成分片上传' })
  completeUpload(@Body() body: any) {
    return this.uploadService.completeUpload(body);
  }

  @Get('status/:uploadId')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('Bearer')
  @ApiOperation({ summary: '查询上传状态' })
  uploadStatus(@Param('uploadId') uploadId: string) {
    return this.uploadService.uploadStatus(uploadId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiSecurity('Bearer')
  @ApiOperation({ summary: '列出上传会话' })
  listUploadSessions() {
    return this.uploadService.listUploadSessions();
  }

  @Get('download/:uploadId')
  @ApiOperation({ summary: '下载已上传文件' })
  downloadUpload(@Param('uploadId') uploadId: string, @Res() res: Response) {
    const result = this.uploadService.downloadUpload(uploadId);
    res.header('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.header('Content-Type', 'application/octet-stream');
    res.sendFile(result.filePath);
  }
}
