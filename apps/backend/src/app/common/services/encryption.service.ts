import { AppConfigService } from '@backend/app/config';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly ivLength = 16; // For GCM
  private readonly authTagLength = 16;

  constructor(private readonly configService: AppConfigService) {
    const encryptionKey = this.configService.encryptionKey;
    if (!encryptionKey || encryptionKey.length !== 32) {
      throw new Error(
        "ENCRYPTION_KEY is not set or invalid"
      );
    }
    this.key = Buffer.from(encryptionKey, 'utf8');
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // IV, authTag va shifrlangan matnni bitta qatorda saqlash
    return Buffer.concat([iv, authTag, encrypted]).toString('hex');
  }

  decrypt(encryptedText: string): string {
    const data = Buffer.from(encryptedText, 'hex');
    const iv = data.slice(0, this.ivLength);
    const authTag = data.slice(this.ivLength, this.ivLength + this.authTagLength);
    const encrypted = data.slice(this.ivLength + this.authTagLength);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString();
  }
}
