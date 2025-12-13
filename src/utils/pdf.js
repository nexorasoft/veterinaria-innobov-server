import PdfPrinter from 'pdfmake';
import bwipjs from 'bwip-js';
import axios from 'axios';

const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const printer = new PdfPrinter(fonts);

async function fetchImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return `data:${response.headers['content-type']};base64,${Buffer.from(response.data).toString('base64')}`;
    } catch (e) { return null; }
}

export const uRide = {
    async generateBarcode(text) {
        return new Promise((resolve) => {
            bwipjs.toBuffer({ bcid: 'code128', text, scale: 3, height: 10, includetext: false },
                (err, png) => resolve(err ? null : 'data:image/png;base64,' + png.toString('base64')));
        });
    },

    async generateRidePdf(data) {
        console.log("Generando RIDE Estilo Profesional:", data.sequential);

        const [barcode, logo] = await Promise.all([
            this.generateBarcode(data.access_key),
            fetchImageAsBase64('https://res.cloudinary.com/dfg9b8dtx/image/upload/v1764604894/logo-veterinaria_gqauas.png')
        ]);

        const styles = {
            headerLarge: { fontSize: 14, bold: true },
            headerTitle: { fontSize: 16, bold: true },
            labelBold: { fontSize: 8, bold: true },
            content: { fontSize: 8 },
            tableHeader: { fontSize: 8, bold: true, alignment: 'center' },
            totalLabel: { fontSize: 9, bold: false },
            totalValue: { fontSize: 9, alignment: 'right' }
        };

        const leftSide = [];

        if (logo) leftSide.push({ image: logo, width: 200, alignment: 'center', margin: [0, 0, 0, 10] });
        else leftSide.push({ text: data.issuer_legal_name, style: 'headerLarge', alignment: 'center', margin: [0, 0, 0, 10] });

        const emisorBox = {
            table: {
                widths: ['*'],
                body: [[
                    {
                        stack: [
                            { text: data.issuer_legal_name, fontSize: 10, bold: true, margin: [0, 0, 0, 5] },
                            { text: data.issuer_trade_name, fontSize: 9, margin: [0, 0, 0, 5] },

                            { text: [{ text: 'Dir. Matriz: ', bold: true }, data.issuer_headquarters_address || 'S/N'], style: 'content', margin: [0, 2] },
                            { text: [{ text: 'Dir. Sucursal: ', bold: true }, data.establishment_address || 'S/N'], style: 'content', margin: [0, 2] },

                            { text: ' ', margin: [0, 5] }, // Espacio

                            { text: [{ text: 'Contribuyente Especial Nro: ', bold: true }, data.special_taxpayer || ''], style: 'content', margin: [0, 2] },
                            { text: [{ text: 'OBLIGADO A LLEVAR CONTABILIDAD: ', bold: true }, (data.accounting_obligation === 'SI' ? 'SI' : 'NO')], style: 'content', margin: [0, 2] }
                        ],
                        margin: [5, 5, 5, 5]
                    }
                ]]
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
        };
        leftSide.push(emisorBox);

        const rightBox = {
            table: {
                widths: ['*'],
                body: [[
                    {
                        stack: [
                            { text: `R.U.C.: ${data.issuer_ruc || data.ruc_company}`, style: 'headerLarge' },
                            { text: 'FACTURA', style: 'headerTitle', margin: [0, 5] },
                            { text: `No. ${data.establishment_code}-${data.emission_point}-${data.sequential_number}`, fontSize: 10, margin: [0, 0, 0, 10] },

                            { text: 'NÚMERO DE AUTORIZACIÓN', style: 'labelBold' },
                            { text: data.authorization_number || 'PENDIENTE', style: 'content', margin: [0, 0, 0, 8] },

                            { text: [{ text: 'FECHA Y HORA DE AUTORIZACIÓN: ', bold: true }, data.authorization_date || 'PENDIENTE'], style: 'content', margin: [0, 2] },
                            { text: [{ text: 'AMBIENTE: ', bold: true }, (data.environment === 1 ? 'PRUEBAS' : 'PRODUCCIÓN')], style: 'content', margin: [0, 2] },
                            { text: [{ text: 'EMISIÓN: ', bold: true }, 'NORMAL'], style: 'content', margin: [0, 8] },

                            { text: 'CLAVE DE ACCESO', style: 'labelBold' },
                            { image: barcode, width: 220, margin: [0, 5, 0, 5] },
                            { text: data.access_key, fontSize: 8, alignment: 'center' }
                        ],
                        margin: [10, 10, 10, 10]
                    }
                ]]
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
        };

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [30, 30, 30, 30],
            content: [
                {
                    columnGap: 15,
                    columns: [
                        { width: '50%', stack: leftSide },
                        { width: '50%', stack: [rightBox] }
                    ]
                },

                { text: '\n' },

                {
                    table: {
                        widths: ['*'],
                        body: [[
                            {
                                columns: [
                                    {
                                        width: '60%',
                                        stack: [
                                            { text: [{ text: 'Razón Social / Nombres y Apellidos: ', bold: true }, data.client_name], style: 'content', margin: [0, 2] },
                                            { text: [{ text: 'Fecha Emisión: ', bold: true }, data.issue_date_full || data.issue_date], style: 'content', margin: [0, 2] },
                                            { text: [{ text: 'Dirección: ', bold: true }, data.client_address || ''], style: 'content', margin: [0, 2] }
                                        ]
                                    },
                                    {
                                        width: '40%',
                                        stack: [
                                            { text: [{ text: 'Identificación: ', bold: true }, data.client_identification], style: 'content', margin: [0, 2] },
                                            { text: [{ text: 'Guía Remisión: ', bold: true }, '-'], style: 'content', margin: [0, 2] }
                                        ]
                                    }
                                ],
                                margin: [5, 5, 5, 5]
                            }
                        ]]
                    },
                    layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
                },

                { text: '\n' },

                {
                    table: {
                        headerRows: 1,
                        widths: ['10%', '8%', '42%', '12%', '12%', '16%'],
                        body: [
                            [
                                { text: 'Cod.\nPrincipal', style: 'tableHeader' },
                                { text: 'Cant', style: 'tableHeader' },
                                { text: 'Descripción', style: 'tableHeader', alignment: 'left' },
                                { text: 'Precio\nUnitario', style: 'tableHeader' },
                                { text: 'Descuento', style: 'tableHeader' },
                                { text: 'Precio\nTotal', style: 'tableHeader' }
                            ],
                            ...data.details.map(item => [
                                { text: item.main_code, style: 'content', alignment: 'center' },
                                { text: item.quantity, style: 'content', alignment: 'center' },
                                { text: item.description, style: 'content', alignment: 'left' },
                                { text: Number(item.unit_price).toFixed(2), style: 'content', alignment: 'right' },
                                { text: Number(item.discount || 0).toFixed(2), style: 'content', alignment: 'right' },
                                { text: Number(item.subtotal).toFixed(2), style: 'content', alignment: 'right' }
                            ])
                        ]
                    },
                    layout: {
                        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1 : 1,
                        vLineWidth: () => 1,
                        hLineColor: () => 'black',
                        vLineColor: () => 'black'
                    }
                },

                { text: '\n' },

                {
                    columns: [
                        {
                            width: '60%',
                            stack: [
                                {
                                    table: {
                                        widths: ['*'],
                                        body: [[
                                            {
                                                stack: [
                                                    { text: 'Información Adicional', bold: true, fontSize: 9, margin: [0, 0, 0, 5] },
                                                    { text: [{ text: 'Email: ', bold: true }, data.client_email || ''], style: 'content' },
                                                    { text: [{ text: 'Teléfono: ', bold: true }, data.client_phone || ''], style: 'content' }
                                                ],
                                                margin: [5, 5, 5, 5]
                                            }
                                        ]]
                                    },
                                    layout: { hLineWidth: () => 1, vLineWidth: () => 1 }
                                },
                                { text: '\n' },
                                {
                                    table: {
                                        widths: ['70%', '30%'],
                                        body: [
                                            [
                                                { text: 'Forma de Pago', style: 'tableHeader', alignment: 'left' },
                                                { text: 'Valor', style: 'tableHeader' }
                                            ],
                                            [
                                                { text: data.payment_method || 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO', style: 'content' },
                                                { text: Number(data.total_with_taxes).toFixed(2), style: 'content', alignment: 'right' }
                                            ]
                                        ]
                                    },
                                    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => 'black', vLineColor: () => 'black' }
                                }
                            ]
                        },

                        {
                            width: '38%',
                            margin: [10, 0, 0, 0],
                            table: {
                                widths: ['60%', '40%'],
                                body: [
                                    [
                                        { text: 'SUBTOTAL 15%', style: 'totalLabel' },
                                        { text: Number(data.total_without_taxes || 0).toFixed(2), style: 'totalValue' }
                                    ],
                                    [
                                        { text: 'SUBTOTAL 0%', style: 'totalLabel' },
                                        { text: '0.00', style: 'totalValue' }
                                    ],
                                    [
                                        { text: 'SUBTOTAL No objeto de IVA', style: 'totalLabel' },
                                        { text: '0.00', style: 'totalValue' }
                                    ],
                                    [
                                        { text: 'SUBTOTAL SIN IMPUESTOS', style: 'totalLabel' },
                                        { text: Number(data.total_without_taxes).toFixed(2), style: 'totalValue' }
                                    ],
                                    [
                                        { text: 'DESCUENTO', style: 'totalLabel' },
                                        { text: Number(data.total_discount || 0).toFixed(2), style: 'totalValue' }
                                    ],
                                    [
                                        { text: 'ICE', style: 'totalLabel' },
                                        { text: '0.00', style: 'totalValue' }
                                    ],
                                    [
                                        { text: 'IVA 15%', style: 'totalLabel' },
                                        { text: Number(data.total_vat).toFixed(2), style: 'totalValue' }
                                    ],
                                    [
                                        { text: 'PROPINA', style: 'totalLabel' },
                                        { text: '0.00', style: 'totalValue' }
                                    ],
                                    [
                                        { text: 'VALOR TOTAL', style: 'labelBold' },
                                        { text: Number(data.total_with_taxes).toFixed(2), style: 'totalValue', bold: true }
                                    ]
                                ]
                            },
                            layout: {
                                hLineWidth: () => 1,
                                vLineWidth: () => 1,
                                hLineColor: () => 'black',
                                vLineColor: () => 'black',
                                paddingLeft: () => 4,
                                paddingRight: () => 4,
                                paddingTop: () => 2,
                                paddingBottom: () => 2
                            }
                        }
                    ]
                }
            ],
            styles: styles
        };

        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        return new Promise((resolve, reject) => {
            const chunks = [];
            pdfDoc.on('data', c => chunks.push(c));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', reject);
            pdfDoc.end();
        });
    }
};