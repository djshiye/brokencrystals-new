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
    if (file.includes('..')) {
      throw new Error('Invalid file path');
    }

    if (file.startsWith('/')) {
      const safePath = path.resolve('/', file);
      await fs.promises.access(safePath, R_OK);

      return fs.createReadStream(safePath);
    } else if (file.startsWith('http')) {
      // Validate URL
      let url;
      try {
        url = new URL(file);
      } catch (err) {
        throw new Error('Invalid URL');
      }

      // Check against allowed hosts
      const allowedHosts = [
        'example.com', // Replace with actual allowed hosts
        'another-example.com'
      ];

      if (!allowedHosts.includes(url.hostname)) {
        throw new Error('Host not allowed');
      }

      // Ensure the path is not accessing metadata endpoints
      const forbiddenPaths = [
        '/metadata/',
        '/latest/meta-data/',
        '/computeMetadata/v1/',
        '/metadata/instance',
        '/metadata/v1'
      ];

      if (forbiddenPaths.some(path => url.pathname.startsWith(path))) {
        throw new Error('Access to metadata endpoints is forbidden');
      }

      const content = await this.cloudProviders.get(file);

      if (content) {
        return Readable.from(content);
      } else {
        throw new Error(`no such file or directory, access '${file}'`);
      }
    } else {
      const safePath = path.resolve(process.cwd(), file);
      await fs.promises.access(safePath, R_OK);

      return fs.createReadStream(safePath);
    }
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
