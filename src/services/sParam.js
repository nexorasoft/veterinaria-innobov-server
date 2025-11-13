import { mParam } from "../models/mParam.js";
import { logger } from "../utils/logger.js";

import { v4 as uuidv4 } from 'uuid';

export const sParam = {
    // Species
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
    // Modules
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
    },
    // Permissions
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
    // Categories
    async createCategory(categoryData) {
        try {
            if (!categoryData.name || typeof categoryData.name !== 'string' || categoryData.name.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Category name is required and must be a non-empty string',
                    data: null
                };
            }

            const newCategory = {
                id: uuidv4(),
                name: categoryData.name.trim(),
                description: categoryData.description || null,
                parent_category_id: categoryData.parent_category_id || null
            };

            const result = await mParam.createCategory(newCategory);

            return result;
        } catch (error) {
            logger.error('Error in createCategory service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while creating category',
                data: null
            };
        }
    },

    async getCategories(page = 1, limit = 10) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const result = await mParam.getCategories(pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in getCategories service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving categories',
                data: null
            };
        }
    },

    async searchCategoriesByName(page = 1, limit = 10, name) {
        try {
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return {
                    success: false,
                    code: 400,
                    message: 'Category name is required and must be a non-empty string',
                    data: null
                };
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mParam.searchCategoriesByName(pageNum, limitNum, name.trim());

            return result;
        } catch (error) {
            logger.error('Error in searchCategoriesByName service', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error while searching categories by name',
                data: null
            };
        }
    }
};