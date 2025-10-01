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
      await fs.promises.access(file, R_OK);

      return fs.createReadStream(file);
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
      file = path.resolve(process.cwd(), file);

      await fs.promises.access(file, R_OK);

      return fs.createReadStream(file);
    }
  }

  private isAllowedUrl(url: URL): boolean {
    // Define a whitelist of allowed hosts
    const allowedHosts = [
      'metadata.google.internal',
      '169.254.169.254'
    ];
    // Ensure the URL is not a private IP address
    const privateIpRegex = /^(10|127|169\.254|192\.168|172\.(1[6-9]|2[0-9]|3[0-1]))\./;
    if (privateIpRegex.test(url.hostname) || this.isPrivateIp(url.hostname)) {
      return false;
    }
    return allowedHosts.includes(url.hostname);
  }

  private isPrivateIp(hostname: string): boolean {
    // Check if the hostname is a private IP address
    const privateIpRegex = /^(10|127|169\.254|192\.168|172\.(1[6-9]|2[0-9]|3[0-1]))\./;
    return privateIpRegex.test(hostname);
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
      file = path.resolve(process.cwd(), file);
      await fs.promises.unlink(file);
      return true;
    }
  }
}