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
    if (!this.isValidPath(file)) {
      throw new Error('Invalid file path');
    }

    if (file.startsWith('/')) {
      await fs.promises.access(file, R_OK);

      return fs.createReadStream(file);
    } else if (file.startsWith('http')) {
      // Validate URL
      const url = new URL(file);
      if (!this.isAllowedHost(url.hostname)) {
        throw new Error(`Access to the host '${url.hostname}' is not allowed`);
      }

      // Ensure the URL path is valid for the host
      if (!this.isValidUrlPath(url)) {
        throw new Error(`Access to the path '${url.pathname}' is not allowed`);
      }

      // Ensure the URL uses HTTPS
      if (url.protocol !== 'https:') {
        throw new Error('Only HTTPS protocol is allowed');
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

  private isAllowedHost(hostname: string): boolean {
    const allowedHosts = [
      'metadata.google.internal',
      // Removed '169.254.169.254' to prevent SSRF
    ];
    return allowedHosts.includes(hostname);
  }

  private isValidUrlPath(url: URL): boolean {
    const allowedPaths = {
      'metadata.google.internal': ['/computeMetadata/v1/'],
      // Add more allowed paths for other hosts if needed
    };
    const paths = allowedPaths[url.hostname] || [];
    return paths.some((allowedPath) => url.pathname.startsWith(allowedPath));
  }

  private isValidPath(filePath: string): boolean {
    // Prevent directory traversal by ensuring the resolved path is within a specific directory
    const baseDir = path.resolve(process.cwd(), 'allowed_directory'); // Change 'allowed_directory' to your base directory
    const resolvedPath = path.resolve(baseDir, filePath);
    return resolvedPath.startsWith(baseDir);
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