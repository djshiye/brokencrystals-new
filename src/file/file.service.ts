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

    if (file.startsWith('/')) {
      // Validate that the file path is within a specific directory
      const baseDir = path.resolve(process.cwd(), 'allowed_directory');
      const resolvedPath = path.resolve(process.cwd(), file);

      if (!resolvedPath.startsWith(baseDir)) {
        throw new Error('Access to this file path is not allowed');
      }

      await fs.promises.access(resolvedPath, R_OK);

      return fs.createReadStream(resolvedPath);
    } else if (file.startsWith('http')) {
      // Validate URL
      const url = new URL(file);
      if (!this.isAllowedHost(url.hostname)) {
        throw new Error(`Access to the host '${url.hostname}' is not allowed`);
      }

      // Ensure the path is within allowed paths
      if (!this.isAllowedPath(url.pathname)) {
        throw new Error(`Access to the path '${url.pathname}' is not allowed`);
      }

      const content = await this.cloudProviders.get(file);

      if (content) {
        return Readable.from(content);
      } else {
        throw new Error(`no such file or directory, access '${file}'`);
      }
    } else {
      const resolvedPath = path.resolve(process.cwd(), file);

      // Validate that the file path is within a specific directory
      const baseDir = path.resolve(process.cwd(), 'allowed_directory');

      if (!resolvedPath.startsWith(baseDir)) {
        throw new Error('Access to this file path is not allowed');
      }

      await fs.promises.access(resolvedPath, R_OK);

      return fs.createReadStream(resolvedPath);
    }
  }

  private isAllowedHost(hostname: string): boolean {
    const allowedHosts = [
      // Removed '169.254.169.254' from allowed hosts
      'metadata.google.internal',
      // Add other allowed hosts here
    ];
    return allowedHosts.includes(hostname);
  }

  private isAllowedPath(pathname: string): boolean {
    const allowedPaths = [
      '/computeMetadata/v1/',
      '/metadata/v1',
      // Removed '/latest/meta-data/' from allowed paths
      '/metadata/instance'
      // Add other allowed paths here
    ];
    return allowedPaths.some(allowedPath => pathname.startsWith(allowedPath));
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
