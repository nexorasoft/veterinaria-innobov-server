import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mParam = {
    async createSpecie(specieData) {
        try {
            const query = `
                INSERT INTO species(
                    id, name, typical_lifespan_years, common_diseases
                ) VALUES (?, ?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    specieData.id,
                    specieData.name,
                    specieData.typical_lifespan_years,
                    specieData.common_diseases,
                ]
            });

            if (result.rowsAffected === 0) {
                logger.warn('Specie creation failed: No rows affected', { name: specieData.name });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create specie',
                    data: null
                };
            }

            logger.info('Specie created successfully', {
                specieId: specieData.id,
                name: specieData.name
            });

            return {
                success: true,
                code: 201,
                message: 'Specie created successfully',
                data: {
                    id: specieData.id,
                    name: specieData.name
                }
            };
        } catch (error) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                logger.warn('Specie creation failed: Duplicate name', { name: specieData.name });
                return {
                    success: false,
                    code: 409,
                    message: 'A specie with this name already exists',
                    data: null
                };
            }

            logger.error('Error creating specie', { error: error.message, name: specieData.name });
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
            const query = `
                INSERT INTO modules(
                    id, name, icon, path, 
                    category, order_index
                ) VALUES (?, ?, ?, ?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    moduleData.id,
                    moduleData.name,
                    moduleData.icon,
                    moduleData.path,
                    moduleData.category,
                    moduleData.order_index
                ]
            });

            if (result.rowsAffected === 0) {
                logger.warn('Module creation failed: No rows affected', { name: moduleData.name });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create module',
                    data: null
                };
            }

            logger.info('Module created successfully', {
                moduleId: moduleData.id,
                name: moduleData.name
            });

            return {
                success: true,
                code: 201,
                message: 'Module created successfully',
                data: {
                    id: moduleData.id,
                    name: moduleData.name
                }
            };
        } catch (error) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                logger.warn('Module creation failed: Duplicate name', { name: moduleData.name });
                return {
                    success: false,
                    code: 409,
                    message: 'A module with this name already exists',
                    data: null
                };
            }

            logger.error('Error creating module', { error: error.message, name: moduleData.name });
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
            const query = `
                INSERT INTO permissions(
                    id, role_id, module_id, can_view,
                    can_create, can_edit, can_delete
                ) VALUES (?, ?, ?, ?, ?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    permissionData.id,
                    permissionData.role_id,
                    permissionData.module_id,
                    permissionData.can_view,
                    permissionData.can_create,
                    permissionData.can_edit,
                    permissionData.can_delete
                ]
            });

            if (result.rowsAffected === 0) {
                logger.warn('Permission creation failed: No rows affected', { roleId: permissionData.role_id, moduleId: permissionData.module_id });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create permission',
                    data: null
                };
            }

            logger.info('Permission created successfully', {
                permissionId: permissionData.id,
                roleId: permissionData.role_id,
                moduleId: permissionData.module_id
            });

            return {
                success: true,
                code: 201,
                message: 'Permission created successfully',
                data: {
                    id: permissionData.id,
                    role_id: permissionData.role_id,
                    module_id: permissionData.module_id
                }
            };
        } catch (error) {
            logger.error('Error creating permission', { error: error.message, roleId: permissionData.role_id, moduleId: permissionData.module_id });
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
            const query = `
                SELECT 
                    m.id, m.name, m.icon, m.path, m.category, m.order_index,
                    p.can_view, p.can_create, p.can_edit, p.can_delete
                FROM modules m
                JOIN permissions p ON m.id = p.module_id
                WHERE p.role_id = ? AND p.can_view = 1
                ORDER BY m.order_index
            `;

            const result = await turso.execute({
                sql: query,
                args: [roleId]
            });

            const modules = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                icon: row.icon,
                path: row.path,
                category: row.category,
                order_index: row.order_index,
                permissions: {
                    can_view: Boolean(row.can_view),
                    can_create: Boolean(row.can_create),
                    can_edit: Boolean(row.can_edit),
                    can_delete: Boolean(row.can_delete)
                }
            }));

            return {
                success: true,
                code: 200,
                message: 'Modules retrieved successfully',
                data: modules
            };
        } catch (error) {
            logger.error('Error retrieving modules by role', { error: error.message, roleId });
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving modules',
                data: null
            };
        }
    }
};