import { turso } from "../database/index.js";
import { logger } from "../utils/logger.js";

export const mParam = {
    //categories
    async createCategory(categoryData) {
        try {
            const query = `
                INSERT INTO categories(
                    id, name, description, parent_category_id
                ) VALUES (?, ?, ?, ?);
            `;

            const result = await turso.execute({
                sql: query,
                args: [
                    categoryData.id,
                    categoryData.name,
                    categoryData.description || null,
                    categoryData.parent_category_id || null
                ]
            });

            if (result.rowsAffected === 0) {
                logger.warn('Category creation failed: No rows affected', { name: categoryData.name });
                return {
                    success: false,
                    code: 500,
                    message: 'Failed to create category',
                    data: null
                };
            }

            logger.info('Category created successfully', {
                categoryId: categoryData.id,
                name: categoryData.name
            });

            return {
                success: true,
                code: 201,
                message: 'Category created successfully',
                data: {
                    id: categoryData.id,
                    name: categoryData.name
                }
            };
        } catch (error) {
            if (error.message?.includes('UNIQUE constraint failed')) {
                logger.warn('Category creation failed: Duplicate name', { name: categoryData.name });
                return {
                    success: false,
                    code: 409,
                    message: 'A category with this name already exists',
                    data: null
                };
            }

            logger.error('Error creating category', { error: error.message, name: categoryData.name });
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
            const offset = (pageNum - 1) * limitNum;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM categories;
            `;

            const dataQuery = `
                SELECT 
                    c.id,
                    c.name,
                    COALESCE(p.name, 'Sin categoría padre') AS parent_name,
                    c.active
                FROM categories c
                LEFT JOIN categories p ON c.parent_category_id = p.id
                ORDER BY c.name ASC
                LIMIT ? OFFSET ?;
            `;

            const [countResult, dataResult] = await Promise.all([
                turso.execute(countQuery),
                turso.execute({ sql: dataQuery, args: [limitNum, offset] })
            ]);

            const totalItems = countResult.rows[0]?.total || 0;
            const totalPages = Math.ceil(totalItems / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Categories retrieved successfully',
                data: {
                    categories: dataResult.rows,
                    pagination: {
                        currentPage: pageNum,
                        totalPages: totalPages,
                        totalItems: totalItems,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPreviousPage: pageNum > 1
                    }
                }
            };
        } catch (error) {
            logger.error('Error retrieving categories', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving categories',
                data: null
            };
        }
    },

    async searchCategoriesByName(page = 1, limit = 10, nameQuery) {
        try {
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;
            const searchPattern = `%${nameQuery}%`;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM categories
                WHERE name LIKE ?;
            `;

            const dataQuery = `
                SELECT 
                    c.id,
                    c.name,
                    COALESCE(p.name, 'Sin categoría padre') AS parent_name,
                    c.active
                FROM categories c
                LEFT JOIN categories p ON c.parent_category_id = p.id
                WHERE c.name LIKE ?
                ORDER BY c.name ASC
                LIMIT ? OFFSET ?;
            `;

            const [countResult, dataResult] = await Promise.all([
                turso.execute({ sql: countQuery, args: [searchPattern] }),
                turso.execute({ sql: dataQuery, args: [searchPattern, limitNum, offset] })
            ]);

            const totalItems = countResult.rows[0]?.total || 0;
            const totalPages = Math.ceil(totalItems / limitNum);

            return {
                success: true,
                code: 200,
                message: 'Categories retrieved successfully',
                data: {
                    categories: dataResult.rows,
                    pagination: {
                        currentPage: pageNum,
                        totalPages: totalPages,
                        totalItems: totalItems,
                        itemsPerPage: limitNum,
                        hasNextPage: pageNum < totalPages,
                        hasPreviousPage: pageNum > 1
                    }
                }
            };
        } catch (error) {
            logger.error('Error searching categories by name', { error: error.message, nameQuery });
            return {
                success: false,
                code: 500,
                message: 'Internal server error while searching categories',
                data: null
            };
        }
    },

    async getCategoryById(categoryId) {
        try {
            const query = `
                SELECT 
                    c.*,
                    p.name as parent_category_name
                FROM categories c
                LEFT JOIN categories p ON c.parent_category_id = p.id
                WHERE c.id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [categoryId]
            });

            if (result.rows.length === 0) {
                logger.info('Category not found', { categoryId });
                return {
                    success: false,
                    code: 404,
                    message: 'Category not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Category retrieved successfully',
                data: result.rows[0]
            };
        } catch (error) {
            logger.error('Error retrieving category by ID', { error: error.message, categoryId });
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving category',
                data: null
            };
        }
    },

    async updateCategory(categoryId, updateData) {
        try {
            const fields = [];
            const values = [];

            Object.keys(updateData).forEach(key => {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            });

            if (fields.length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No fields to update',
                    data: null
                };
            }

            values.push(categoryId);

            const query = `
                UPDATE categories 
                SET ${fields.join(', ')} 
                WHERE id = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: values
            });

            if (result.rowsAffected === 0) {
                logger.info('Category update failed: Not found', { categoryId });
                return {
                    success: false,
                    code: 404,
                    message: 'Category not found',
                    data: null
                };
            }

            logger.info('Category updated successfully', { categoryId });

            return {
                success: true,
                code: 200,
                message: 'Category updated successfully',
                data: { category_id: categoryId }
            };
        } catch (error) {
            logger.error('Error updating category', { error: error.message, categoryId });
            return {
                success: false,
                code: 500,
                message: 'Internal server error while updating category',
                data: null
            };
        }
    },

    async deleteCategory(categoryId) {
        const tx = await turso.transaction();
        try {
            const childrenCheck = await tx.execute({
                sql: "SELECT COUNT(*) as total FROM categories WHERE parent_category_id = ?",
                args: [categoryId]
            });

            if (childrenCheck.rows[0].total > 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 409,
                    message: `Cannot delete: This category has ${childrenCheck.rows[0].total} subcategory(ies). Delete or move them first.`,
                    data: null
                };
            }

            const productsCheck = await tx.execute({
                sql: "SELECT COUNT(*) as total FROM products WHERE category_id = ?",
                args: [categoryId]
            });

            if (productsCheck.rows[0].total > 0) {
                await tx.rollback();
                return {
                    success: false,
                    code: 409,
                    message: `Cannot delete: This category has ${productsCheck.rows[0].total} product(s) assigned.`,
                    data: null
                };
            }

            const deleteResult = await tx.execute({
                sql: "DELETE FROM categories WHERE id = ?",
                args: [categoryId]
            });

            if (deleteResult.rowsAffected === 0) {
                await tx.rollback();
                logger.info('Category deletion failed: Not found', { categoryId });
                return {
                    success: false,
                    code: 404,
                    message: 'Category not found',
                    data: null
                };
            }

            await tx.commit();
            logger.info('Category deleted successfully', { categoryId });

            return {
                success: true,
                code: 200,
                message: 'Category deleted successfully',
                data: { category_id: categoryId }
            };
        } catch (error) {
            console.log(error);
            logger.error('Error deleting category', { error: error.message, categoryId });
            return {
                success: false,
                code: 500,
                message: 'Internal server error while deleting category',
                data: null
            };
        }
    },

    //species
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

    async getSpeciesForDropdown() {
        try {
            const query = `
                SELECT id, name
                FROM species
                ORDER BY name ASC;
            `;

            const result = await turso.execute(query);

            if (result.rows.length === 0) {
                logger.info('No species found for dropdown');
                return {
                    success: false,
                    code: 404,
                    message: 'No species available',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Species retrieved successfully',
                data: result.rows
            };
        } catch (error) {
            logger.error('Error retrieving all species', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Internal server error while retrieving species',
                data: null
            };
        }
    },

    //modules
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
    },

    //permissions
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
};