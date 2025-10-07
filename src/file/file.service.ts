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

  private isValidPath(filePath: string): boolean {
    // Define a base directory for file access
    const baseDir = path.resolve(process.cwd(), 'allowed_files');
    const resolvedPath = path.resolve(baseDir, filePath);
    return resolvedPath.startsWith(baseDir);
  }

  async getFile(file: string): Promise<Stream> {
    this.logger.log(`Reading file: ${file}`);

    if (file.startsWith('/')) {
      if (!this.isValidPath(file)) {
        throw new Error('Access to this file path is not allowed');
      }
      await fs.promises.access(file, R_OK);

      return fs.createReadStream(file);
    } else if (file.startsWith('http')) {
      // Validate URL
      let url;
      try {
        url = new URL(file);
      } catch (err) {
        throw new Error('Invalid URL');
      }

      // Check if the URL is within allowed domains
      const allowedDomains = [
        'example.com', // Replace with actual allowed domains
        'another-example.com'
      ];
      if (!allowedDomains.includes(url.hostname)) {
        throw new Error('URL not allowed');
      }

      // Ensure the URL path is within allowed paths
      const allowedPaths = this.cloudProviders.getAllowedPaths(url.hostname);
      if (!allowedPaths.some(allowedPath => url.pathname.startsWith(allowedPath))) {
        throw new Error('URL path not allowed');
      }

      // Ensure the URL uses HTTPS
      if (url.protocol !== 'https:') {
        throw new Error('Only HTTPS protocol is allowed');
      }

      // Ensure the URL does not contain query parameters
      if (url.search) {
        throw new Error('Query parameters are not allowed in the URL');
      }

      const content = await this.cloudProviders.get(file);

      if (content) {
        return Readable.from(content);
      } else {
        throw new Error(`no such file or directory, access '${file}'`);
      }
    } else {
      if (!this.isValidPath(file)) {
        throw new Error('Access to this file path is not allowed');
      }
      file = path.resolve(process.cwd(), file);

      await fs.promises.access(file, R_OK);

      return fs.createReadStream(file);
    }
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