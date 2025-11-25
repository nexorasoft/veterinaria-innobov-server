import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET } from '../config/env.js';

cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_API_KEY,
    api_secret: CLOUD_API_SECRET,
    secure: true
});

export const uImage = {
    async uploadImageOptimized(imageBuffer, folderName, options = {}) {
        const baseTransformations = [
            { fetch_format: "auto" },
            { quality: "auto" },
            { strip: true }
        ];

        if (options.maxWidth || options.maxHeight) {
            baseTransformations.push({
                width: options.maxWidth,
                height: options.maxHeight,
                crop: "limit"
            });
        }

        const uploadOptions = {
            folder: folderName,
            resource_type: "auto",
            transformation: baseTransformations,
            ...options
        };

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            
            Readable.from(imageBuffer).pipe(uploadStream);
        });
    },

    async deleteMedia(publicId, resourceType = 'image') {
        try {
            const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            return result;
        } catch (error) {
            throw error;
        }
    },
};