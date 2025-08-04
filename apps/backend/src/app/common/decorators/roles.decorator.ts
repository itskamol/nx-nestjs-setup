import { SetMetadata } from '@nestjs/common';
import { Role } from '@shared/types';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Decorator to specify required roles for a route
 * @param roles Array of roles that can access the route
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);