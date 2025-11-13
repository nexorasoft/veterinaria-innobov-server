import { sParam } from "../services/sParam.js";
import { logger } from "../utils/logger.js";

export const cParam = {
    async createSpecie(req, res) {
        try {
            const specieData = req.body;

            logger.debug('Create Specie request received', {
                name: specieData?.name
            });

            const result = await sParam.createSpecie(specieData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createSpecie controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async createModule(req, res) {
        try {
            const moduleData = req.body;

            logger.debug('Create Module request received', {
                name: moduleData?.name,
            });

            const result = await sParam.createModule(moduleData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createModule controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async createPermission(req, res) {
        try {
            const permissionData = req.body;

            logger.debug('Create Permission request received', {
                role_id: permissionData?.role_id,
                module_id: permissionData?.module_id
            });

            const result = await sParam.createPermission(permissionData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createPermission controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async createCategory(req, res) {
        try {
            const categoryData = req.body;

            logger.debug('Create Category request received', {
                name: categoryData?.name
            });

            const result = await sParam.createCategory(categoryData || {});

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in createCategory controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getModulesByRole(req, res) {
        try {
            const { roleId } = req.params;

            logger.debug('Get Modules by Role request received', { roleId });

            const result = await sParam.getModulesByRole(roleId);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getModulesByRole controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async getCategories(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await sParam.getCategories(page, limit);
            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in getCategories controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    },

    async searchCategoriesByName(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const name = req.query.name || '';

            logger.debug('Search Categories by Name request received', { name, page, limit });

            const result = await sParam.searchCategoriesByName(page, limit, name);

            return res.status(result.code).json(result);
        } catch (error) {
            logger.error('Error in searchCategoriesByName controller', error);
            return res.status(500).json({
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            });
        }
    }
};