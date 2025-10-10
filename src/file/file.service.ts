import { Injectable, Logger } from '@nestjs/common';
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

    // Validate the file path to prevent directory traversal
    if (file.includes('..') || path.isAbsolute(file)) {
      throw new Error('Invalid file path');
    }

    file = path.resolve(process.cwd(), file);

    await fs.promises.access(file, R_OK);

    return fs.createReadStream(file);
  }

  private isAllowedHost(hostname: string): boolean {
    // Updated allowed hosts to prevent SSRF
    const allowedHosts = [
      'example.com', // Add legitimate hosts here
      'another-example.com'
    ];
    return allowedHosts.includes(hostname);
  }

  async deleteFile(file: string): Promise<boolean> {
    if (file.startsWith('/')) {
      throw new Error('cannot delete file from this location');
    } else if (file.startsWith('http')) {
      throw new Error('cannot delete file from this location');
    } else {
      file = path.resolve(process.cwd(), file);
      await fs.promises.unlink(file);
      return true;
    }
  }
}