// import {
//   Controller,
//   Post,
//   Param,
//   Body,
//   Req,
//   UseGuards,
//   ForbiddenException,
//   Patch,
//   Get,
//   HttpStatus,
// } from '@nestjs/common';
// import {
//   ApiTags,
//   ApiOperation,
//   ApiResponse,
//   ApiBody,
//   ApiParam,
//   ApiOkResponse,
// } from '@nestjs/swagger';
// import { CreateProfileDto } from './dto/create-profile.dto';
// import { ProfileService } from './profile.service';
// import { RolesGuard } from 'src/auth/roles.guard';
// import { Roles } from 'src/auth/decorator/roles.decorator';
// import { UserRole } from 'src/user/entities/user.entity';
// import { UpdateProfileDto } from './dto/update-profile.dto';
// import { Profile } from './entities/profile.entity';

// @ApiTags('User Profile')
// @Controller('users/:userId/profile')
// @UseGuards(RolesGuard)
// @Roles(UserRole.ADMIN, UserRole.STUDENT, UserRole.INSTRUCTOR)
// export class UserProfileController {
//   constructor(private readonly profileService: ProfileService) {}

//   @Post()
//   @ApiOperation({
//     summary: 'Create a user profile',
//     description:
//       'Creates a profile for a specific user. Only the user or an admin can perform this action.',
//   })
//   @ApiParam({
//     name: 'userId',
//     type: String,
//     description: 'Unique identifier of the user',
//   })
//   @ApiBody({ type: CreateProfileDto })
//   @ApiResponse({
//     status: HttpStatus.CREATED,
//     description: 'Profile successfully created.',
//     type: Profile,
//   })
//   @ApiResponse({
//     status: HttpStatus.FORBIDDEN,
//     description: 'User is not authorized to create this profile.',
//   })
//   async create(
//     @Param('userId') userId: string,
//     @Body() createProfileDto: CreateProfileDto,
//     @Req() req,
//   ) {
//     if (userId !== req.user.sub) {
//       throw new ForbiddenException();
//     }

//     return this.profileService.createProfile(userId, createProfileDto);
//   }

//   @Patch()
//   @ApiOperation({
//     summary: 'Update a user profile',
//     description:
//       'Updates the profile of a specific user. Only the user or an admin can update their profile.',
//   })
//   @ApiParam({
//     name: 'userId',
//     type: String,
//     description: 'Unique identifier of the user',
//   })
//   @ApiBody({ type: UpdateProfileDto })
//   @ApiResponse({
//     status: HttpStatus.OK,
//     description: 'Profile updated successfully.',
//     type: Profile,
//   })
//   @ApiResponse({
//     status: HttpStatus.FORBIDDEN,
//     description: 'User is not authorized to update this profile.',
//   })
//   async update(
//     @Param('userId') userId: string,
//     @Body() updateProfileDto: UpdateProfileDto,
//     @Req() req,
//   ) {
//     if (userId !== req.user.sub) {
//       throw new ForbiddenException();
//     }

//     return this.profileService.updateProfile(userId, updateProfileDto);
//   }

//   @Get()
//   @ApiOperation({
//     summary: 'Get a user profile',
//     description:
//       'Retrieves the profile of a specific user. Only the user or an admin can view this profile.',
//   })
//   @ApiParam({
//     name: 'userId',
//     type: String,
//     description: 'Unique identifier of the user',
//   })
//   @ApiOkResponse({
//     description: 'Profile retrieved successfully.',
//     type: Profile,
//   })
//   @ApiResponse({
//     status: HttpStatus.FORBIDDEN,
//     description: 'User is not authorized to view this profile.',
//   })
//   async findOne(@Param('userId') userId: string, @Req() req) {
//     if (userId !== req.user.sub) {
//       throw new ForbiddenException();
//     }

//     return this.profileService.getProfileByUserId(userId);
//   }
// }
