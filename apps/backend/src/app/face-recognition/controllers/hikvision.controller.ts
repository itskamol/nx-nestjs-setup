import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HikvisionIsapiService } from '../services/hiki.service';
import { CreatePersonDto, SetListenerDto } from '../dto/hikvision.dto';
import { RolesGuard } from '@backend/app/common';

interface ExpressMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags('Hikvision Device Management')
@ApiBearerAuth('JWT-auth') // Protects all endpoints in this controller
@Controller('hikvision')
@UseGuards(RolesGuard) // Example guard to protect routes
export class HikvisionController {
  constructor(private readonly hikvisionIsapiService: HikvisionIsapiService) {}

  @Get('device-info')
  @ApiOperation({
    summary: 'Get Device Information',
    description:
      'Retrieves basic hardware and firmware information from the ISAPI device. Useful for testing the connection.',
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved device information.' })
  @ApiResponse({
    status: 502,
    description: 'Device Connection Error. Could not reach or authenticate with the device.',
  })
  async getDeviceInfo() {
    return this.hikvisionIsapiService.getDeviceInfo();
  }

  @Post('persons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a Person',
    description: 'Adds a new person record to the access control list on the device.',
  })
  @ApiBody({ type: CreatePersonDto })
  @ApiResponse({ status: 201, description: 'Person created successfully on the device.' })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request or an ISAPI error occurred (e.g., person with that ID already exists).',
  })
  async addPerson(@Body() createPersonDto: CreatePersonDto) {
    const { employeeNo, name, userType } = createPersonDto;
    await this.hikvisionIsapiService.addPerson(employeeNo, name, userType);
    return { success: true, message: `Person ${employeeNo} created successfully.` };
  }

  @Post('persons/:employeeNo/face')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('faceImage'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Add a Face to a Person',
    description: 'Uploads a face image and associates it with an existing person on the device.',
  })
  @ApiParam({
    name: 'employeeNo',
    description: 'The unique ID of the person to associate the face with.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        faceImage: {
          type: 'string',
          format: 'binary',
          description: 'The JPEG image file of the face.',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Face image was successfully added and linked.' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request (e.g., no file uploaded, or the person does not exist).',
  })
  async addFace(
    @Param('employeeNo') employeeNo: string,
    @UploadedFile() faceImage: ExpressMulterFile
  ) {
    if (!faceImage || !faceImage.buffer) {
      throw new BadRequestException('A face image file is required.');
    }
    await this.hikvisionIsapiService.addFace(employeeNo, faceImage.buffer);
    return { success: true, message: `Face successfully added to person ${employeeNo}.` };
  }

  @Delete('persons/:employeeNo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a Person',
    description:
      'Deletes a person and all of their associated credentials (face, card, etc.) from the device.',
  })
  @ApiParam({ name: 'employeeNo', description: 'The unique ID of the person to delete.' })
  @ApiResponse({ status: 204, description: 'Person deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Person with the specified ID was not found.' })
  async deletePerson(@Param('employeeNo') employeeNo: string): Promise<void> {
    await this.hikvisionIsapiService.deletePerson(employeeNo);
  }

  @Put('event-listener')
  @ApiOperation({
    summary: 'Configure Event Listener',
    description:
      'Sets the HTTP endpoint on the device where real-time events (like face recognition) will be sent. [cite: 160, 216]',
  })
  @ApiBody({ type: SetListenerDto })
  @ApiResponse({ status: 200, description: 'Event listener URL was configured successfully.' })
  async setEventListener(@Body() setListenerDto: SetListenerDto) {
    // The host ID is typically 1 for the primary listener endpoint.
    await this.hikvisionIsapiService.setEventListener(setListenerDto.url, 1);
    return { success: true, message: `Event listener successfully set to ${setListenerDto.url}` };
  }
}
