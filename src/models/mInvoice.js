import { turso } from '../database/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export const mInvoice = {
    async createInvoice(invoiceData) {
        const client = await turso.transaction();
        try {
            if (!invoiceData.details || invoiceData.details.length === 0) {
                await client.rollback();
                return { success: false, code: 400, message: 'Invoice must have at least one detail item.', data: null };
            }

            // 1. INSERTAR CABECERA (Igual que antes)
            const insertInvoiceQuery = `
                INSERT INTO invoices (
                    id, issuing_company_id, client_id, issue_date, access_key,
                    sequential, status, total_without_taxes, total_vat, 
                    total_with_taxes, xml, signed_xml, authorization_number,
                    authorization_date, sri_status, sri_sent_at, sri_response_at,
                    original_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;

            await client.execute({
                sql: insertInvoiceQuery,
                args: [
                    invoiceData.id,
                    'main',
                    invoiceData.client_id,
                    invoiceData.issue_date_full || invoiceData.issue_date, // Asegura formato fecha correcto
                    invoiceData.access_key,
                    invoiceData.sequential,
                    invoiceData.status || 'CREATED',
                    invoiceData.total_without_taxes,
                    invoiceData.total_vat,
                    invoiceData.total_with_taxes,
                    invoiceData.xml || null,
                    invoiceData.signed_xml || null,
                    invoiceData.authorization_number || null,
                    invoiceData.authorization_date || null,
                    invoiceData.sri_status || null,
                    invoiceData.sri_sent_at || null,
                    invoiceData.sri_response_at || null,
                    invoiceData.original_data || null
                ]
            });

            const invoiceId = invoiceData.id;

            // 2. INSERTAR DETALLES (CORREGIDO)
            const detailsPromises = invoiceData.details.map(item => {

                // Determinamos los IDs basados en el item_id y el tipo
                // (Asumiendo que getFullInvoiceData retorna 'item_id' y 'item_type')

                let productId = null;
                let serviceId = null;

                // Opción A: Si ya tienes product_id y service_id separados en el objeto item (lo hicimos en el paso anterior)
                if (item.product_id) productId = item.product_id;
                if (item.service_id) serviceId = item.service_id;

                // Opción B: Si solo tienes item_id y item_type, usa esta lógica:
                if (!productId && !serviceId) {
                    if (item.item_type === 'PRODUCTO') productId = item.item_id;
                    else serviceId = item.item_id;
                }

                const insertDetailQuery = `
                    INSERT INTO invoice_details (
                        id, invoice_id, product_id, service_id, quantity, 
                        unit_price, subtotal, vat_value
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                `;

                return client.execute({
                    sql: insertDetailQuery,
                    args: [
                        uuidv4(),
                        invoiceId,
                        productId,  // Puede ser null si es servicio
                        serviceId,  // Puede ser null si es producto
                        item.quantity,
                        item.unit_price,
                        item.subtotal,
                        item.taxes && item.taxes.tax ? item.taxes.tax.value : 0 // Obtener valor del IVA si viene anidado o plano
                    ]
                });
            });

            await Promise.all(detailsPromises);

            await client.commit();

            return {
                success: true,
                code: 201,
                message: 'Invoice created successfully.',
                data: { invoice_id: invoiceId }
            };

        } catch (error) {
            await client.rollback();
            logger.error('Error creating invoice:', error);

            // ... (tus manejos de errores siguen igual)
            if (error.message?.includes('FOREIGN KEY constraint failed')) {
                return {
                    success: false,
                    message: 'Error de base de datos: Se intentó guardar un producto/servicio que no existe.',
                    code: 400,
                    data: null
                };
            }

            return { success: false, code: 500, message: error.message, data: null };
        }
    },

    async getNextSequential() {
        try {
            const query = `
                SELECT MAX(CAST(sequential AS INTEGER)) as last_sequence
                FROM invoices 
                WHERE issuing_company_id = 'main';
            `;

            const result = await turso.execute(query);
            const lastSequence = result.rows[0].last_sequence;
            const nextSequence = lastSequence ? String(lastSequence + 1).padStart(9, '0') : '000000001';

            return nextSequence
        } catch (error) {
            logger.error('Error generating next sequential:', error);
            return null;
        }
    },

    async getNextFullInvoiceNumber() {
        try {
            const query = `
                SELECT 
                    s.establishment_code || s.emission_point || 
                    printf('%09d', 
                        COALESCE(
                            (SELECT MAX(CAST(sequential AS INTEGER)) FROM invoices), 
                            0
                        ) + 1
                    ) AS next_invoice_number
                FROM system_settings s
                WHERE s.id = 'main';
            `;

            const result = await turso.execute(query);
            return result.rows[0].next_invoice_number;
        } catch (error) {
            logger.error('Error generating next full invoice number:', error);
            return null;
        }
    },

    async getAccessKeyData() {
        try {
            const query = `
                SELECT 
                    ruc, environment_type, establishment_code,
                    emission_point, emission_type, business_name, 
                    trade_name, headquarters_address, establishment_address,
                    accounting_obligation, special_taxpayer, ruc
                FROM system_settings
                WHERE id = 'main';
            `;

            const result = await turso.execute(query);
            return result.rows[0];
        } catch (error) {
            logger.error('Error fetching access key data:', error);
            return null;
        }
    },

    async getIdentificationTypeCode(identificationTypeId) {
        try {
            const query = `
                SELECT code
                FROM identification_types
                WHERE id = ?
            `;

            const result = await turso.execute({
                sql: query,
                args: [identificationTypeId]
            });

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error fetching identification type code:', error);
            return null;
        }
    },

    async getCertificateAndPassword(ruc) {
        try {
            const query = `
                SELECT certificate, certificate_password
                FROM system_settings
                WHERE ruc = ?;
            `;

            const result = await turso.execute({
                sql: query,
                args: [ruc]
            });

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Error fetching certificate data:', error);
            return null;
        }
    },

    async getFullInvoiceData(saleId) {
        try {
            const query = `
                SELECT 
                    sa.id as sale_id,
                    sa.created_at as issue_date_full,
                    strftime('%d/%m/%Y', sa.created_at) as issue_date,
                    
                    sa.payment_method,
                    
                    c.id as client_id,
                    c.identification as client_identification,
                    id.code as identification_type_code,
                    c.name as client_name,
                    c.email as client_email,
                    c.phone as client_phone,
                    c.address as client_address,

                    sa.subtotal as total_without_taxes,
                    sa.tax as total_vat,
                    sa.discount as total_discount,
                    sa.total as total_with_taxes,

                    ss.ruc as ruc_company,

                  json_group_array(
                    json_object(
                        -- === MODIFICACIÓN AQUÍ ===
                        -- 1. Obtenemos el ID real sin importar si es producto o servicio
                        'item_id', COALESCE(sd.product_id, sd.service_id),
                        
                        -- 2. También los incluimos por separado por si los necesitas
                        'product_id', sd.product_id,
                        'service_id', sd.service_id,
                        'item_type', sd.item_type, -- Útil para saber qué lógica aplicar
                        
                        'quantity', sd.quantity,
                        'unit_price', sd.price,
                        'subtotal', sd.subtotal,
                        'discount', sd.discount,
                        'description', COALESCE(sd.description, p.name, s.name, 'Item'),
                        
                        'main_code', CASE 
                            WHEN sd.item_type = 'PRODUCTO' THEN COALESCE(p.code, 'PROD-' || substr(p.id, 1, 6))
                            WHEN sd.item_type = 'SERVICIO' THEN 'SERV-' || substr(s.id, 1, 6)
                            ELSE 'GEN'
                        END,

                        'is_taxable', CASE
                            WHEN sd.item_type = 'PRODUCTO' THEN COALESCE(p.taxable, 0)
                            WHEN sd.item_type = 'SERVICIO' THEN COALESCE(s.taxable, 0)
                            ELSE 0
                        END,

                        'tax_amount', CASE
                            WHEN (sd.item_type = 'PRODUCTO' AND COALESCE(p.taxable, 0) = 1) OR 
                                 (sd.item_type = 'SERVICIO' AND COALESCE(s.taxable, 0) = 1)
                            THEN 
                                ROUND(sd.subtotal * (ss.tax_percentage / 100), 2)
                            ELSE 0
                        END
                    )
                ) as details_json

                FROM sales sa
                JOIN clients c ON sa.client_id = c.id
                LEFT JOIN sale_details sd ON sa.id = sd.sale_id
                LEFT JOIN products p ON sd.product_id = p.id
                LEFT JOIN services s ON sd.service_id = s.id
                LEFT JOIN identification_types id ON c.identification_type_id = id.id
                CROSS JOIN system_settings ss
                WHERE sa.id = ?
                GROUP BY sa.id;
            `;

            const result = await turso.execute({ sql: query, args: [saleId] });

            if (result.rows.length === 0) return null;

            const row = result.rows[0];

            return {
                ...row,
                details: JSON.parse(row.details_json || '[]'),
            };

        } catch (error) {
            logger.error('Error fetching full invoice data', error);
            throw error;
        }
    },

    async updateSRIStatus(id, { sri_status, sri_messages, sri_response_at }) {
        try {
            const sql = `
                UPDATE invoices 
                SET 
                    sri_status = ?,
                    sri_messages = ?,
                    sri_response_at = ?
                WHERE id = ?
            `;

            await turso.execute({
                sql,
                args: [sri_status, sri_messages, sri_response_at, id]
            });

            return { success: true };
        } catch (error) {
            logger.error('Error updating SRI status', error);
            return { success: false };
        }
    },

    async updateAuthorization(id, { authorization_number, authorization_date, sri_status, xml_authorized }) {
        try {
            const sql = `
                UPDATE invoices 
                SET 
                    authorization_number = ?,
                    authorization_date = ?,
                    sri_status = ?,
                    xml_authorized = ?,
                    status = 'COMPLETED'
                WHERE id = ?
            `;

            await turso.execute({
                sql,
                args: [
                    authorization_number,
                    authorization_date,
                    sri_status,
                    xml_authorized,
                    id
                ]
            });

            return { success: true };
        } catch (error) {
            logger.error('Error updating authorization', error);
            return { success: false };
        }
    },
};