import { mPet } from "../models/mPet.js";
import { logger } from "../utils/logger.js";
import { hPet } from "../helpers/hPet.js";
import { v4 as uuidv4 } from 'uuid';
import { uImage } from "../utils/image.js";

export const sPet = {
    async getAllPets(filters) {
        try {
            const pageNum = Math.max(1, parseInt(filters.page));
            const limitNum = Math.max(1, Math.min(100, parseInt(filters.limit)));
            const search = filters.search || '';

            const modelResponse = await mPet.getAllPets({ search, page: pageNum, limit: limitNum });
            return modelResponse;
        } catch (error) {
            logger.error('Error in service layer while retrieving pets:', error);
            throw error;
        }
    },

    async getPetProfile(petId) {
        try {
            if (!petId) {
                return {
                    success: false,
                    code: 400,
                    message: 'Pet ID is required',
                    data: null
                };
            }

            const result = await mPet.getPetProfile(petId);
            if (!result) return result;

            const pet = result.data;
            console.log('Pet data retrieved:', pet);
            const ageLabel = hPet._calculateAgeLabel(pet.birth_date);

            const formattedProfile = {
                id: pet.id,
                name: pet.name,
                species: pet.species_name,
                breed: pet.breed,
                sex: pet.sex,
                birth_date: pet.birth_date,
                age_label: ageLabel,
                current_weight: pet.weight,
                color: pet.color,
                photo_url: pet.photo_url || null,
                microchip: pet.microchip,
                active: Boolean(pet.active),

                medical_alerts: {
                    allergies: pet.allergies,
                    special_conditions: pet.special_conditions,
                    is_sterilized: Boolean(pet.sterilized),
                    is_deceased: Boolean(pet.deceased),
                    deceased_date: pet.deceased_date
                },

                owner: {
                    id: pet.owner_id,
                    name: pet.owner_name,
                    phone: pet.owner_phone,
                    address: pet.owner_address,
                    dni: pet.owner_dni
                }
            }

            return {
                success: true,
                code: 200,
                message: 'Perfil recuperado',
                data: formattedProfile
            };
        } catch (error) {
            logger.error('Error in service layer while retrieving pet profile:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            }
        }
    },

    async updatePet(petId, petData, imageBuffer = null) {
        let newUploadedImage = null;
        let currentPetData = null;

        try {
            if (!petId) {
                return {
                    success: false,
                    code: 400,
                    message: 'Pet ID is required',
                    data: null
                };
            }

            if (imageBuffer) {
                const petQuery = await mPet.getByIdForService(petId);
                currentPetData = petQuery;

                if (!currentPetData) {
                    return {
                        success: false,
                        code: 404,
                        message: 'Pet not found',
                        data: null
                    };
                }

                try {
                    newUploadedImage = await uImage.uploadImageOptimized(
                        imageBuffer,
                        'veterinaria/mascotas',
                        {
                            maxWidth: 800,
                            public_id: `pet_${petId}_${Date.now()}`
                        }
                    );
                } catch (uploadError) {
                    logger.error('Error uploading new pet image:', uploadError);
                    return { success: false, code: 500, message: 'Error uploading image', data: null };
                }
            }

            const cleanData = {};
            if (petData.name) cleanData.name = petData.name.trim();
            if (petData.breed) cleanData.breed = petData.breed.trim();
            if (petData.color) cleanData.color = petData.color.trim();
            if (petData.sex) cleanData.sex = petData.sex;
            if (petData.birth_date) cleanData.birth_date = petData.birth_date;
            if (petData.microchip) cleanData.microchip = petData.microchip.trim();

            if (petData.allergies !== undefined) cleanData.allergies = petData.allergies;
            if (petData.special_conditions !== undefined) cleanData.special_conditions = petData.special_conditions;
            if (petData.sterilized !== undefined) cleanData.sterilized = (petData.sterilized === '1' || petData.sterilized === true || petData.sterilized === 1) ? 1 : 0;
            if (petData.active !== undefined) cleanData.active = petData.active;
            if (petData.deceased !== undefined) cleanData.deceased = (petData.deceased === '1' || petData.deceased === true || petData.deceased === 1) ? 1 : 0;
            if (petData.deceased_date) cleanData.deceased_date = petData.deceased_date;

            if (newUploadedImage) {
                cleanData.photo_url = newUploadedImage.secure_url;
                cleanData.photo_public_id = newUploadedImage.public_id;
            }

            if (Object.keys(cleanData).length === 0) {
                if (!newUploadedImage) {
                    return {
                        success: false,
                        code: 400,
                        message: 'No valid fields to update',
                        data: null
                    };
                }
            }

            const result = await mPet.updatePet(petId, cleanData);

            if (result.success) {
                if (newUploadedImage && currentPetData && currentPetData.photo_public_id) {
                    logger.info(`Deleting old image for pet ${petId}`);
                    uImage.deleteMedia(currentPetData.photo_public_id).catch(e => logger.warn('Failed to delete old image', e));
                }
            } else {
                if (newUploadedImage) {
                    logger.warn('DB Update failed, rolling back new image...');
                    await uImage.deleteMedia(newUploadedImage.public_id);
                }
            }

            return result;

        } catch (error) {
            logger.error('Error in service layer while updating pet:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            }
        }
    },

    async addWeightRecord(petId, body, userId) {
        try {
            if (!petId) return {
                success: false,
                code: 400,
                message: 'Pet ID is required',
                data: null
            };

            if (!body.weight || isNaN(body.weight) || body.weight <= 0) {
                return {
                    success: false,
                    code: 400,
                    message: 'The weight must be a number greater than 0.',
                    data: null
                };
            }

            const data = {
                id: uuidv4(),
                pet_id: petId,
                weight: Number(body.weight),
                notes: body.notes ? body.notes.trim() : null,
                recorded_by: userId || null
            };

            const result = await mPet.addWeightRecord(data);
            return result;
        } catch (error) {
            logger.error('Service Error: addWeightRecord', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }

    },

    async getWeightHistory(petId) {
        try {
            if (!petId) return {
                success: false,
                code: 400,
                message: 'Pet ID is required',
                data: null
            };
            return await mPet.getWeightHistory(petId);
        } catch (error) {
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    },

    async deleteWeightRecord(petId, weightId) {
        try {
            if (!petId || !weightId) {
                return {
                    success: false,
                    code: 400,
                    message: 'Pet ID and Weight Record ID are required',
                    data: null
                };
            }
            return await mPet.deleteWeightRecord(weightId, petId);
        } catch (error) {
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
};