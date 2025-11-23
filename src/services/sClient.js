import { mClient } from "../models/mClient.js";
import { logger } from "../utils/logger.js";
import { uImage } from "../utils/image.js";

import { v4 as uuidv4 } from 'uuid';

export const sClient = {
    async getClients(filterParams) {
        try {
            const {
                page = 1,
                limit = 10,
                status = true,
                from_date,
                to_date
            } = filterParams;

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mClient.getClients({
                status,
                from_date,
                to_date,
                page: pageNum,
                limit: limitNum
            });

            return result;
        } catch (error) {
            logger.error('Error in service layer while retrieving clients:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async searchClients(searchTerm, page = 1, limit = 10) {
        try {
            if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid search term',
                    data: null
                };
            }

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

            const result = await mClient.searchClients(searchTerm, pageNum, limitNum);
            return result;
        } catch (error) {
            logger.error('Error in service layer while searching clients:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getClientFullProfile(clientId) {
        try {
            if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid client ID',
                    data: null
                };
            }

            const result = await mClient.getClientFullProfile(clientId);
            return result;
        } catch (error) {
            logger.error('Error in service layer while retrieving full client profile:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async createClient(clientData) {
        try {
            const requiredFields = ['dni', 'name', 'phone'];
            const missingFields = requiredFields.filter(field => !clientData[field]);

            if (missingFields.length > 0) {
                return {
                    success: false,
                    code: 400,
                    message: `Faltan campos requeridos: ${missingFields.join(', ')}`,
                    data: null
                };
            }

            const cleanData = {
                id: uuidv4(),
                dni: clientData.dni.trim(),
                name: clientData.name.trim().toUpperCase(),
                phone: clientData.phone ? clientData.phone.trim() : null,
                email: clientData.email ? clientData.email.trim().toLowerCase() : null,
                address: clientData.address ? clientData.address.trim() : null,
                notes: clientData.notes || null,
                active: clientData.active !== undefined ? clientData.active : true
            };

            const result = await mClient.createClient(cleanData);
            return result;
        } catch (error) {
            logger.error('Error in service layer while creating client:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async updateClient(clientId, updateData) {
        try {
            if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid client ID',
                    data: null
                };
            }

            if (Object.keys(updateData).length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'No update data provided',
                    data: null
                };
            }

            const cleanData = {};
            if (updateData.name) cleanData.name = updateData.name.trim().toUpperCase();
            if (updateData.dni) cleanData.dni = updateData.dni.trim();
            if (updateData.phone) cleanData.phone = updateData.phone.trim();
            if (updateData.email) cleanData.email = updateData.email.trim().toLowerCase();
            if (updateData.address) cleanData.address = updateData.address.trim();
            if (updateData.notes !== undefined) cleanData.notes = updateData.notes;
            if (updateData.active !== undefined) cleanData.active = updateData.active;

            const result = await mClient.updateClient(clientId, cleanData);
            return result;
        } catch (error) {
            logger.error('Error in service layer while updating client:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async getClientAccountStatus(clientId) {
        try {
            if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid client ID',
                    data: null
                };
            }

            const result = await mClient.getClientAccountStatus(clientId);
            return result;
        } catch (error) {
            logger.error('Error in service layer while retrieving client account status:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async addPetToClient(clientId, petData) {
        let uploadedImage = null;
        try {
            if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'Invalid client ID',
                    data: null
                };
            }

            if (!petData.name || !petData.species_id) {
                return {
                    success: false,
                    code: 400,
                    message: 'Pet name and species are required.',
                    data: null
                };
            }

            if (petData.imageBuffer) {
                try {
                    uploadedImage = await uImage.uploadImageOptimized(
                        petData.imageBuffer,
                        'veterinaria/animales',
                        {
                            maxWidth: 800,
                            public_id: `${petData.name.trim().toLowerCase()}_${clientId}`
                        }
                    );
                } catch (uploadError) {
                    logger.error('Cloudinary upload failed:', uploadError);
                    return {
                        success: false,
                        code: 500,
                        message: 'Error uploading pet image',
                        data: null
                    };
                }
            }

            const cleanPetData = {
                id: uuidv4(),
                client_id: clientId,
                name: petData.name.trim().toUpperCase(),
                species_id: petData.species_id,
                breed: petData.breed ? petData.breed.trim() : null,
                sex: petData.sex || 'Macho',
                birth_date: petData.birth_date || null,
                color: petData.color ? petData.color.trim() : null,
                weight: petData.weight ? Number(petData.weight) : 0,
                microchip: petData.microchip ? petData.microchip.trim() : null,
                sterilized: petData.sterilized ? 1 : 0,
                allergies: petData.allergies || null,
                special_conditions: petData.special_conditions || null,
                active: 1,
                photo_url: uploadedImage ? uploadedImage.secure_url : null,
                photo_public_id: uploadedImage ? uploadedImage.public_id : null,
                weight_record_id: uuidv4()
            };

            const result = await mClient.addPetToClient(cleanPetData);

            if (!result.success && uploadedImage) {
                logger.warn('DB insert failed, rolling back Cloudinary image...');
                await uImage.deleteMedia(uploadedImage.public_id);
            }

            return result;
        } catch (error) {
            logger.error('Error in sClients.addPetToClient', error);
            if (uploadedImage) {
                await uImage.deleteMedia(uploadedImage.public_id).catch(e => logger.error('Failed to rollback image', e));
            }
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }

    },

    async registerFullClient(data) {
        let uploadedImage = null;
        try {
            const { client, pet } = data;

            if (!client || !client.dni || !client.name) {
                return {
                    success: false,
                    code: 400,
                    message: 'Required customer data is missing.',
                    data: null
                };
            }

            if (!pet || !pet.name || !pet.species_id) {
                return {
                    success: false,
                    code: 400,
                    message: 'Required pet data is missing.',
                    data: null
                };
            }

            const imageBuffer = data.imageBuffer || null;
            if (imageBuffer) {
                try {
                    uploadedImage = await uImage.uploadImageOptimized(
                        imageBuffer,
                        'veterinaria/animales',
                        {
                            maxWidth: 800,
                            public_id: `${pet.name}_${client.dni}`
                        }
                    );
                } catch (uploadError) {
                    logger.error('Cloudinary upload failed in registerFullClient:', uploadError);
                    return {
                        success: false,
                        code: 500,
                        message: 'Error uploading pet image',
                        data: null
                    };
                }
            }

            const cleanClient = {
                id: uuidv4(),
                dni: client.dni.trim(),
                name: client.name.trim().toUpperCase(),
                phone: client.phone ? client.phone.trim() : null,
                email: client.email ? client.email.trim().toLowerCase() : null,
                address: client.address ? client.address.trim() : null,
                notes: client.notes || null,
                active: 1
            };

            const cleanPet = {
                id: uuidv4(),
                name: pet.name.trim().toUpperCase(),
                species_id: pet.species_id,
                breed: pet.breed || null,
                sex: pet.sex || 'Macho',
                birth_date: pet.birth_date || null,
                color: pet.color || null,
                weight: pet.weight ? Number(pet.weight) : 0,
                microchip: pet.microchip || null,
                sterilized: pet.sterilized ? 1 : 0,
                allergies: pet.allergies || null,
                special_conditions: pet.special_conditions || null,
                active: 1,
                photo_url: uploadedImage ? uploadedImage.secure_url : null,
                photo_public_id: uploadedImage ? uploadedImage.public_id : null,
                pet_weight_history_id: uuidv4()
            };

            const result = await mClient.registerFullClient(cleanClient, cleanPet);
            if (!result.success && uploadedImage) {
                logger.warn('DB transaction failed, rolling back Cloudinary image...');
                await uImage.deleteMedia(uploadedImage.public_id);
            }
            return result;
        } catch (error) {
            logger.error('Error in sClients.registerFullClient', error);
            if (uploadedImage) {
                await uImage.deleteMedia(uploadedImage.public_id).catch(e => logger.error('Rollback failed', e));
            }
            return {
                success: false,
                code: 500,
                message: 'Error en registro express',
                data: null
            };
        }
    }
};