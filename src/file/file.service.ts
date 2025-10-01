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

    // Validate and sanitize the file path
    if (!this.isValidPath(file)) {
      throw new Error('Invalid file path');
    }

    if (file.startsWith('/')) {
      const safePath = path.join(process.cwd(), 'safe_directory', file);
      await fs.promises.access(safePath, R_OK);

      return fs.createReadStream(safePath);
    } else if (file.startsWith('http')) {
      // Validate URL
      let url;
      try {
        url = new URL(file);
      } catch (err) {
        throw new Error(`Invalid URL: ${file}`);
      }

      // Check if the URL is allowed
      if (!this.isAllowedUrl(url)) {
        throw new Error(`Access to the URL is not allowed: ${file}`);
      }

      const content = await this.cloudProviders.get(file);

      if (content) {
        return Readable.from(content);
      } else {
        throw new Error(`no such file or directory, access '${file}'`);
      }
    } else {
      const safePath = path.join(process.cwd(), 'safe_directory', file);
      await fs.promises.access(safePath, R_OK);

      return fs.createReadStream(safePath);
    }
  }

  private isAllowedUrl(url: URL): boolean {
    // Define a whitelist of allowed hosts
    const allowedHosts = [
      'metadata.google.internal',
      '169.254.169.254'
    ];
    return allowedHosts.includes(url.hostname);
  }

  private isValidPath(filePath: string): boolean {
    // Prevent path traversal by checking for '..'
    const resolvedPath = path.resolve(filePath);
    return !resolvedPath.includes('..');
  }

  async deleteFile(file: string): Promise<boolean> {
    if (file.startsWith('/')) {
      throw new Error('cannot delete file from this location');
    } else if (file.startsWith('http')) {
      throw new Error('cannot delete file from this location');
    } else {
      const safePath = path.join(process.cwd(), 'safe_directory', file);
      await fs.promises.unlink(safePath);
      return true;
    }
  }
}