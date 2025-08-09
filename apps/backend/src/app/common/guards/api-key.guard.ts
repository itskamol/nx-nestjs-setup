import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DevicesService } from '../../devices/devices.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly devicesService: DevicesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const deviceId = request.body.deviceId;

    if (!apiKey || !deviceId) {
      throw new UnauthorizedException('API key and device ID are required.');
    }

    const device = await this.devicesService.findByDeviceId(deviceId);

    if (!device || device.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid device or device is not active.');
    }

    const isMatch = await bcrypt.compare(apiKey, device.apiKeyHash);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid API key.');
    }

    // You might want to attach the device to the request object for later use
    // request.device = device;

    return true;
  }
}
