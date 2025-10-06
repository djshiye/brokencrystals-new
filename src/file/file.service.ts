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
    if (!this.isValidLocalPath(file)) {
      throw new Error('Invalid file path');
    }

    if (file.startsWith('/')) {
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

      // Check against allowed hosts
      const allowedHosts = [
        'metadata.google.internal',
        '169.254.169.254'
      ];

      if (!allowedHosts.includes(url.hostname)) {
        throw new Error('Host not allowed');
      }

      // Additional validation to prevent SSRF
      if (!this.isValidPath(url.pathname)) {
        throw new Error('Invalid path');
      }

      // Ensure the URL uses HTTP or HTTPS
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }

      const content = await this.cloudProviders.get(file);

      if (content) {
        return Readable.from(content);
      } else {
        throw new Error(`no such file or directory, access '${file}'`);
      }
    } else {
      file = path.resolve(process.cwd(), file);

      await fs.promises.access(file, R_OK);

      return fs.createReadStream(file);
    }
  }

  private isValidLocalPath(filePath: string): boolean {
    // Prevent directory traversal by ensuring the path is within a specific directory
    const baseDir = path.resolve(process.cwd(), 'allowed_directory');
    const resolvedPath = path.resolve(process.cwd(), filePath);
    return resolvedPath.startsWith(baseDir);
  }

  private isValidPath(pathname: string): boolean {
    // Implement path validation logic here
    // For example, only allow certain paths or patterns
    const allowedPaths = ['/metadata/instance/network'];
    return allowedPaths.includes(pathname);
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