import { Injectable, Logger } from '@nestjs/common';
import { Readable, Stream } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { CloudProvidersMetaData } from './cloud.providers.metadata';
import { R_OK } from 'constants';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private cloudProviders = new CloudProvidersMetaData();

  private isValidPath(filePath: string): boolean {
    // Allow only specific directories
    const allowedBasePath = path.resolve(process.cwd(), 'config/products/crystals');
    const resolvedPath = path.resolve(process.cwd(), filePath);
    return resolvedPath.startsWith(allowedBasePath);
  }

  async getFile(file: string): Promise<Stream> {
    this.logger.log(`Reading file: ${file}`);

    if (!this.isValidPath(file)) {
      throw new Error('Invalid file path');
    }

    const resolvedFilePath = path.resolve(process.cwd(), file);

    if (!resolvedFilePath.startsWith(path.resolve(process.cwd(), 'config/products/crystals'))) {
      throw new Error('Access to this file path is not allowed');
    }

    await fs.promises.access(resolvedFilePath, R_OK);

    return fs.createReadStream(resolvedFilePath);
  }

  async deleteFile(file: string): Promise<boolean> {
    if (file.startsWith('/') || file.includes('..') || path.isAbsolute(file)) {
      throw new Error('Invalid file path');
    } else if (file.startsWith('http')) {
      throw new Error('cannot delete file from this location');
    } else {
      file = path.resolve(process.cwd(), file);
      await fs.promises.unlink(file);
      return true;
    }
  }
}