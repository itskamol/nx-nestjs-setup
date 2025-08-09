import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FaceRecognitionService } from '../services/face-recognition.service';
import {
  SearchFaceRequestDto,
  CreateFaceRecordDto,
  ModifyFaceRecordDto,
  DeleteFaceRequestDto,
  GetFaceLibCapabilitiesResponseDto,
  SearchFaceResponseDto,
  CreateFaceRecordResponseDto,
  GenericResponseDto,
} from '../dto';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Face Recognition')
@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(
    private readonly faceRecognitionService: FaceRecognitionService,
  ) {}

  @Get('capabilities')
  @ApiOperation({ summary: 'Get device capabilities for face recognition' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved capabilities.', type: GetFaceLibCapabilitiesResponseDto })
  getCapabilities(): Promise<GetFaceLibCapabilitiesResponseDto> {
    return this.faceRecognitionService.getCapabilities();
  }

  @Post('search')
  @ApiOperation({ summary: 'Search for face picture records' })
  @ApiResponse({ status: 200, description: 'Successfully performed search.', type: SearchFaceResponseDto })
  search(@Body() searchDto: SearchFaceRequestDto): Promise<SearchFaceResponseDto> {
    return this.faceRecognitionService.search(searchDto);
  }

  @Post('record')
  @UseInterceptors(FileInterceptor('FacePicture'))
  @ApiOperation({ summary: 'Add a new face picture record' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
      schema: {
          type: 'object',
          properties: {
              FaceDataRecord: {
                  type: 'string',
                  description: 'JSON string of the face record metadata. e.g. { "faceLibType": "staticFD", "FDID": "1", "employeeNo": "101" }'
              },
              FacePicture: {
                  type: 'string',
                  format: 'binary',
              },
          },
      },
  })
  @ApiResponse({ status: 201, description: 'Successfully created face record.', type: CreateFaceRecordResponseDto })
  createRecord(
    @Body() createDto: CreateFaceRecordDto,
    @UploadedFile() facePicture: Express.Multer.File,
  ): Promise<CreateFaceRecordResponseDto> {
    // The DTO from multipart is a string, so we parse it
    const parsedDto: CreateFaceRecordDto = { FaceDataRecord: JSON.parse(createDto.FaceDataRecord as any) };
    return this.faceRecognitionService.createRecord(parsedDto, facePicture);
  }

  @Put('modify')
  @UseInterceptors(FileInterceptor('FacePicture'))
  @ApiOperation({ summary: 'Edit an existing face picture record' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
        type: 'object',
        properties: {
            FaceDataRecord: {
                type: 'string',
                description: 'JSON string of the face record metadata. e.g. { "FDID": "1", "FPID": "pic123" }'
            },
            FacePicture: {
                type: 'string',
                format: 'binary',
                description: '(Optional) New face picture to upload'
            },
        },
    },
})
  @ApiResponse({ status: 200, description: 'Successfully modified face record.', type: GenericResponseDto })
  modifyRecord(
    @Body() modifyDto: ModifyFaceRecordDto,
    @UploadedFile() facePicture?: Express.Multer.File,
  ): Promise<GenericResponseDto> {
    const parsedDto: ModifyFaceRecordDto = { FaceDataRecord: JSON.parse(modifyDto.FaceDataRecord as any) };
    return this.faceRecognitionService.modifyRecord(parsedDto, facePicture);
  }

  @Put('delete')
  @ApiOperation({ summary: 'Delete face picture records' })
  @ApiResponse({ status: 200, description: 'Successfully deleted face records.', type: GenericResponseDto })
  delete(@Body() deleteDto: DeleteFaceRequestDto): Promise<GenericResponseDto> {
    return this.faceRecognitionService.delete(deleteDto);
  }
}
