import { v4 as uuidv4 } from 'uuid';
import { mPurchase } from "../models/mPurchase.js";
import { mNotification } from "../models/mNotification.js";

export const hPurchase = {
    validatePurchaseData(data) {
        const { supplier_id, items } = data;

        if (!supplier_id) {
            return { valid: false, error: 'Debe seleccionar un proveedor' };
        }

        if (!items || items.length === 0) {
            return { valid: false, error: 'Debe agregar al menos un producto' };
        }

        for (const item of items) {
            const { product_id, new_product, quantity, price } = item;

            if (!product_id && !new_product) {
                return {
                    valid: false,
                    error: 'Cada item debe tener product_id o new_product'
                };
            }

            if (!product_id && new_product) {
                const { name, category_id, purchase_price, sale_price, min_stock, unit } = new_product;
                
                if (!name || !category_id || purchase_price === undefined || sale_price === undefined || 
                    min_stock === undefined || !unit) {
                    return {
                        valid: false,
                        error: 'new_product debe tener: name, category_id, purchase_price, sale_price, min_stock, unit'
                    };
                }
            }

            if (!quantity || !price) {
                return {
                    valid: false,
                    error: 'Cada producto debe tener quantity y price'
                };
            }

            if (quantity <= 0 || price < 0) {
                return {
                    valid: false,
                    error: 'Cantidad y precio deben ser mayores a 0'
                };
            }
        }

        return { valid: true };
    },

    calculateTotals(items, discount = 0) {
        const subtotal = items.reduce((sum, item) => {
            return sum + (item.quantity * item.price);
        }, 0);

        const total = subtotal - discount;

        return {
            subtotal,
            tax: 0,
            total: parseFloat(total.toFixed(2))
        };
    },

    async validateAndEnrichItems(items, supplierId) {
        const validatedItems = [];
        const newProducts = [];

        for (const item of items) {
            const { product_id, new_product, quantity, price, expiration_date, batch_number } = item;
            const itemSubtotal = quantity * price;
            let finalProductId = product_id;
            let productName = '';
            let currentStock = 0;
            let minStock = 0;

            if (!product_id && new_product) {
                finalProductId = uuidv4();
                productName = new_product.name;
                currentStock = quantity;
                minStock = new_product.min_stock || 0;

                newProducts.push({
                    id: finalProductId,
                    category_id: new_product.category_id,
                    supplier_id: supplierId,
                    code: new_product.code || null,
                    name: new_product.name,
                    description: new_product.description || null,
                    purchase_price: new_product.purchase_price,
                    sale_price: new_product.sale_price,
                    wholesale_price: new_product.wholesale_price || null,
                    stock: quantity,
                    min_stock: new_product.min_stock || 0,
                    max_stock: new_product.max_stock || null,
                    unit: new_product.unit,
                    is_medicine: new_product.is_medicine || 0,
                    requires_prescription: new_product.requires_prescription || 0,
                    active_ingredient: new_product.active_ingredient || null,
                    concentration: new_product.concentration || null,
                    expiration_date: expiration_date || null,
                    batch_number: batch_number || null,
                    active: 1,
                    taxable: new_product.taxable !== undefined ? new_product.taxable : 1
                });
            } 
            else if (product_id) {
                const product = await mPurchase.getProductById(product_id);

                if (!product) {
                    throw new Error(`Producto ${product_id} no encontrado`);
                }

                productName = product.name;
                currentStock = product.stock;
                minStock = product.min_stock;
            }

            validatedItems.push({
                detail_id: uuidv4(),
                product_id: finalProductId,
                product_name: productName,
                quantity,
                price,
                subtotal: itemSubtotal,
                expiration_date: expiration_date || null,
                batch_number: batch_number || null,
                current_stock: currentStock,
                min_stock: minStock,
                is_new_product: !product_id && !!new_product
            });
        }

        return { validatedItems, newProducts };
    },

    async createNotifications(validatedItems) {
        try {
            for (const item of validatedItems) {
                const product = await mPurchase.getProductById(item.product_id);

                if (!product) continue;

                if (product.stock <= product.min_stock) {
                    await mPurchase.insertNotification({
                        id: uuidv4(),
                        title: 'Stock Bajo después de Compra',
                        message: `El producto "${product.name}" aún tiene stock bajo (${product.stock} unidades)`,
                        type: 'STOCK',
                        priority: 'ALTA',
                        related_entity_type: 'product',
                        related_entity_id: product.id
                    });
                }

                if (item.expiration_date) {
                    const daysUntilExpiry = await mPurchase.calculateDaysUntilExpiry(item.expiration_date);

                    if (daysUntilExpiry && daysUntilExpiry <= 60) {
                        await mNotification.insertNotification({
                            id: uuidv4(),
                            title: 'Producto Próximo a Vencer',
                            message: `El producto "${product.name}" (Lote: ${item.batch_number || 'N/A'}) vence el ${item.expiration_date}`,
                            type: 'STOCK',
                            priority: 'ALTA',
                            related_entity_type: 'product',
                            related_entity_id: product.id
                        });
                    }
                }
            }
        } catch (error) {
            logger.error('Error al crear notificaciones:', error);
        }
    }
}