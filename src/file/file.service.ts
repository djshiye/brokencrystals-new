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
    const baseDir = path.resolve(process.cwd(), 'config/products/crystals');
    const resolvedPath = path.resolve(baseDir, filePath);
    return resolvedPath.startsWith(baseDir);
  }

  async getFile(file: string): Promise<Stream> {
    this.logger.log(`Reading file: ${file}`);

    if (!this.isValidPath(file)) {
      throw new Error('Access to this file path is not allowed');
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

      // Check if the URL is within allowed domains
      const allowedDomains = [
        CloudProvidersMetaData.GOOGLE,
        CloudProvidersMetaData.AWS,
        CloudProvidersMetaData.AZURE,
        CloudProvidersMetaData.DIGITAL_OCEAN
      ];

      if (!allowedDomains.some(domain => url.href.startsWith(domain))) {
        throw new Error('URL is not within allowed domains');
      }

      // Ensure the path is valid within the provider's metadata
      const providerPath = url.href.replace(url.origin, '');
      const validPaths = this.cloudProviders.getValidPaths(url.origin);

      if (!validPaths.some(validPath => providerPath.startsWith(validPath))) {
        throw new Error('Path is not valid within the provider metadata');
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

  async deleteFile(file: string): Promise<boolean> {
    if (file.startsWith('/')) {
      throw new Error('cannot delete file from this location');
    } else if (file.startsWith('http')) {
      throw new Error('cannot delete file from this location');
    } else {
      file = path.resolve(process.cwd(), file);
      try {
        await fs.promises.unlink(file);
        return true;
      } catch (err) {
        this.logger.error(err.message);
        throw new Error('An error occurred while deleting the file.');
      }
    }
  }
}