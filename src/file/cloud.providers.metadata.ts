import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CloudProvidersMetaData {
  public static readonly GOOGLE: string =
    'http://metadata.google.internal/computeMetadata/v1/';
  public static readonly AZURE: string =
    'http://169.254.169.254/metadata/instance';
  public static readonly DIGITAL_OCEAN: string =
    'http://169.254.169.254/metadata/v1';
  public static readonly DIGITAL_OCEAN_JSON: string =
    'http://169.254.169.254/metadata/v1.json'; //https://docs.digitalocean.com/reference/api/metadata/#tag/Droplet-Properties
  public static readonly AWS: string =
    'http://169.254.169.254/latest/meta-data/';

  private providers: Map<string, string[]> = new Map<string, string[]>();

  constructor() {
    this.providers.set(
      CloudProvidersMetaData.GOOGLE,
      [
        'instance/',
        'oslogin/',
        'project/'
      ]
    );
    this.providers.set(
      CloudProvidersMetaData.DIGITAL_OCEAN,
      [
        'id',
        'hostname',
        'user-data',
        'vendor-data',
        'public-keys',
        'region',
        'interfaces/',
        'dns/',
        'floating_ip/',
        'reserved_ip/',
        'tags/',
        'features/'
      ]
    );
    this.providers.set(
      CloudProvidersMetaData.AZURE,
      [
        'compute/',
        'network/'
      ]
    );
    this.providers.set(
      CloudProvidersMetaData.AWS,
      [
        'ami-id',
        'ami-launch-index',
        'ami-manifest-path',
        'block-device-mapping/',
        'events/',
        'hostname',
        'iam/',
        'instance-action',
        'instance-id',
        'instance-life-cycle',
        'instance-type',
        'local-hostname',
        'local-ipv4',
        'mac',
        'metrics/',
        'network/',
        'placement/',
        'profile',
        'public-hostname',
        'public-ipv4',
        'public-keys/',
        'reservation-id',
        'security-groups',
        'services/'
      ]
    );
  }

  async get(providerUrl: string): Promise<string> {
    if (providerUrl.startsWith(CloudProvidersMetaData.GOOGLE)) {
      return this.providers.get(CloudProvidersMetaData.GOOGLE).join('\n');
    } else if (providerUrl.startsWith(CloudProvidersMetaData.DIGITAL_OCEAN)) {
      return this.providers.get(CloudProvidersMetaData.DIGITAL_OCEAN).join('\n');
    } else if (providerUrl.startsWith(CloudProvidersMetaData.AWS)) {
      return this.providers.get(CloudProvidersMetaData.AWS).join('\n');
    } else if (providerUrl.startsWith(CloudProvidersMetaData.AZURE)) {
      return this.providers.get(CloudProvidersMetaData.AZURE).join('\n');
    } else {
      throw new Error('Access to this URL is not allowed');
    }
  }

  getValidPaths(provider: string): string[] {
    return this.providers.get(provider) || [];
  }
}