import { mParam } from "../models/mParam.js";
import { logger } from "../utils/logger.js";

import { v4 as uuidv4 } from 'uuid';

export const sParam = {
    async createSpecie(specieData) {
        try {
            if (!specieData.name || typeof specieData.name !== 'string' || specieData.name.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Specie name is required and must be a non-empty string',
                    data: null
                };
            }

            const newSpecie = {
                id: uuidv4(),
                name: specieData.name.trim(),
                typical_lifespan_years: specieData.typical_lifespan_years || null,
                common_diseases: specieData.common_diseases || null,
            };

            const result = await mParam.createSpecie(newSpecie);

            return result;
        } catch (error) {
            logger.error('Error in createSpecie service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating specie',
                data: null
            };
        }
    },

    async createModule(moduleData) {
        try {
            if (!moduleData.name || typeof moduleData.name !== 'string' || moduleData.name.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Module name is required and must be a non-empty string',
                    data: null
                };
            }

            if (!moduleData.icon || typeof moduleData.icon !== 'string' || moduleData.icon.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Module icon is required and must be a non-empty string',
                    data: null
                };
            }

            if (!moduleData.path || typeof moduleData.path !== 'string' || moduleData.path.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Module path is required and must be a non-empty string',
                    data: null
                };
            }

            if (moduleData.category && typeof moduleData.category !== 'string') {
                return {
                    success: false,
                    code: 400,
                    message: 'Module category must be a string',
                    data: null
                };
            }

            if (moduleData.order_index && isNaN(moduleData.order_index)) {
                return {
                    success: false,
                    code: 400,
                    message: 'Module order_index must be a number',
                    data: null
                };
            }

            const newModule = {
                id: uuidv4(),
                name: moduleData.name.trim(),
                icon: moduleData.icon.trim(),
                path: moduleData.path.trim(),
                category: moduleData.category?.trim() || null,
                order_index: moduleData.order_index || 0
            };

            const result = await mParam.createModule(newModule);

            return result;

        } catch (error) {
            logger.error('Error in createModule service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating module',
                data: null
            };
        }
    },

    async createPermission(permissionData) {
        try {
            if (!permissionData.role_id || typeof permissionData.role_id !== 'string' || permissionData.role_id.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Role ID is required and must be a valid non-empty string',
                    data: null
                };
            }

            if (!permissionData.module_id || typeof permissionData.module_id !== 'string' || permissionData.module_id.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Module ID is required and must be a valid non-empty string',
                    data: null
                };
            }

            const canView = Boolean(permissionData.can_view);
            const canCreate = Boolean(permissionData.can_create);
            const canEdit = Boolean(permissionData.can_edit);
            const canDelete = Boolean(permissionData.can_delete);

            const newPermission = {
                id: uuidv4(),
                role_id: permissionData.role_id.trim(),
                module_id: permissionData.module_id.trim(),
                can_view: canView,
                can_create: canCreate,
                can_edit: canEdit,
                can_delete: canDelete
            };

            const result = await mParam.createPermission(newPermission);

            return result;
        } catch (error) {
            logger.error('Error in createPermission service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating permission',
                data: null
            };
        }
    },

    async getModulesByRole(roleId) {
        try {
            if (!roleId || typeof roleId !== 'string' || roleId.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Role ID is required and must be a valid non-empty string',
                    data: null
                };
            }

            const modules = await mParam.getModulesByRole(roleId.trim());

            return modules;
        } catch (error) {
            logger.error('Error in getModulesByRole service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving modules by role',
                data: null
            };
        }
    }
};