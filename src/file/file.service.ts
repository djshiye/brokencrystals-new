import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { Readable, Stream } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { CloudProvidersMetaData } from './cloud.providers.metadata';
import { R_OK } from 'constants';
import { URL } from 'url';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private cloudProviders = new CloudProvidersMetaData();

  async getFile(file: string): Promise<Stream> {
    this.logger.log(`Reading file: ${file}`);

    // Validate and sanitize the file path
    if (file.includes('..') || path.isAbsolute(file)) {
      throw new Error('Invalid file path');
    }

    const safePath = path.resolve(process.cwd(), file);
    await fs.promises.access(safePath, R_OK);

    return fs.createReadStream(safePath);
  }

  async deleteFile(file: string): Promise<boolean> {
    try {
      if (file.startsWith('/')) {
        throw new Error('cannot delete file from this location');
      } else if (file.startsWith('http')) {
        throw new Error('cannot delete file from this location');
      } else {
        const safePath = path.resolve(process.cwd(), file);
        await fs.promises.unlink(safePath);
        return true;
      }
    } catch (err) {
      this.logger.error('Error deleting file', err.stack);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }
}
