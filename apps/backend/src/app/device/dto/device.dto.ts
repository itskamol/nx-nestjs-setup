import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class CreateDeviceDto {
  @ApiProperty({ 
    description: 'The name of the device',
    example: 'Office Printer'
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'The username for the device',
    example: 'admin'
  })
  @IsString()
  username: string;

  @ApiProperty({ 
    description: 'The password for the device',
    example: 'password123'
  })
  @IsString()
  password: string;

  @ApiProperty({ 
    description: 'The host of the device',
    example: '192.168.1.100'
  })
  @IsString()
  host: string;

  @ApiProperty({ 
    description: 'The port of the device',
    example: 9100
  })
  @IsNumber()
  port: number;
}
