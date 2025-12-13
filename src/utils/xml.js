import { create } from 'xmlbuilder2';

export function buildInvoiceXML(xmlData) {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('factura', { id: 'comprobante', version: '1.0.0' });

    // === infoTributaria ===
    doc.ele('infoTributaria')
        .ele('ambiente').txt(xmlData.taxInformation.environment).up()
        .ele('tipoEmision').txt(xmlData.taxInformation.emission_type).up()
        .ele('razonSocial').txt(xmlData.taxInformation.issuer_legal_name).up()
        .ele('nombreComercial').txt(xmlData.taxInformation.issuer_trade_name).up()
        .ele('ruc').txt(xmlData.taxInformation.issuer_ruc).up()
        .ele('claveAcceso').txt(xmlData.taxInformation.access_key).up()
        .ele('codDoc').txt(xmlData.taxInformation.document_type).up()
        .ele('estab').txt(xmlData.taxInformation.establishment_code).up()
        .ele('ptoEmi').txt(xmlData.taxInformation.emission_point).up()
        .ele('secuencial').txt(xmlData.taxInformation.sequential).up()
        .ele('dirMatriz').txt(xmlData.taxInformation.issuer_headquarters_address || 'Dirección no especificada').up()
        .up();

    // === infoFactura ===
    const invoiceInfo = doc.ele('infoFactura')
        .ele('fechaEmision').txt(xmlData.infoInvoice.issue_date).up()
        .ele('dirEstablecimiento').txt(xmlData.infoInvoice.establishment_address || 'Dirección no especificada').up()
        .ele('obligadoContabilidad').txt(xmlData.infoInvoice.accounting_obligation).up()
        .ele('tipoIdentificacionComprador').txt(xmlData.infoInvoice.buyer_identification_type).up()
        .ele('razonSocialComprador').txt(xmlData.infoInvoice.buyer_legal_name).up()
        .ele('identificacionComprador').txt(xmlData.infoInvoice.buyer_identification).up()
        .ele('totalSinImpuestos').txt(xmlData.infoInvoice.total_without_taxes).up()
        .ele('totalDescuento').txt(xmlData.infoInvoice.total_discounts || '0.00').up();

    // Totales con impuestos (Resumen Global)
    const taxesContainer = invoiceInfo.ele('totalConImpuestos');

    if (xmlData.infoInvoice.taxes && xmlData.infoInvoice.taxes.length > 0) {
        xmlData.infoInvoice.taxes.forEach(tax => {
            taxesContainer
                .ele('totalImpuesto')
                .ele('codigo').txt(tax.tax_code).up()
                .ele('codigoPorcentaje').txt(tax.tax_percentage_code).up()
                .ele('baseImponible').txt(tax.tax_base).up()
                .ele('valor').txt(tax.tax_value).up()
                .up();
        });
    }
    taxesContainer.up();

    // Importes Totales
    invoiceInfo
        .ele('propina').txt(xmlData.infoInvoice.tip || '0.00').up()
        .ele('importeTotal').txt(xmlData.infoInvoice.total_amount).up()
        .ele('moneda').txt(xmlData.infoInvoice.currency || 'DOLAR').up();


    const paymentsNode = invoiceInfo.ele('pagos');

    if (xmlData.infoInvoice.payments && xmlData.infoInvoice.payments.length > 0) {
        xmlData.infoInvoice.payments.forEach(payment => {
            const paymentItem = paymentsNode.ele('pago');

            paymentItem.ele('formaPago').txt(payment.payment_method).up();
            paymentItem.ele('total').txt(payment.total).up();

            if (payment.days_to_pay) {
                paymentItem.ele('plazo').txt(payment.days_to_pay).up();
            }
            if (payment.time_unit) {
                paymentItem.ele('unidadTiempo').txt(payment.time_unit).up();
            }

            paymentItem.up();
        });
    }
    paymentsNode.up();

    invoiceInfo.up();

    // === detalles ===
    const detailsNode = doc.ele('detalles');

    if (xmlData.details && xmlData.details.length > 0) {
        xmlData.details.forEach(item => {
            const detail = detailsNode.ele('detalle')
                .ele('codigoPrincipal').txt(item.main_code).up()
                .ele('descripcion').txt(item.description).up()
                .ele('cantidad').txt(item.quantity).up()
                .ele('precioUnitario').txt(item.unit_price).up()
                .ele('descuento').txt(item.discount || '0.00').up()
                .ele('precioTotalSinImpuesto').txt(item.total_without_taxes).up();

            const taxesNode = detail.ele('impuestos');

            if (item.taxes && item.taxes.length > 0) {
                item.taxes.forEach(t => {
                    taxesNode
                        .ele('impuesto')
                        .ele('codigo').txt(t.tax_code).up()
                        .ele('codigoPorcentaje').txt(t.tax_percentage_code).up()
                        .ele('tarifa').txt(t.tax_fee).up()
                        .ele('baseImponible').txt(t.tax_base).up()
                        .ele('valor').txt(t.tax_value).up()
                        .up();
                });
            }

            taxesNode.up();
            detail.up();
        });
    }

    detailsNode.up();

    // === infoAdicional ===
    const additionalInfoNode = doc.ele('infoAdicional');

    if (xmlData.additionalInfo && xmlData.additionalInfo.length > 0) {
        xmlData.additionalInfo.forEach(field => {
            additionalInfoNode
                .ele('campoAdicional', { nombre: field.name })
                .txt(field.value)
                .up();
        });
    } else {
        additionalInfoNode
            .ele('campoAdicional', { nombre: 'Email' })
            .txt(xmlData.infoInvoice.buyer_email || 'sinfactura@cliente.com')
            .up()
            .ele('campoAdicional', { nombre: 'Teléfono' })
            .txt(xmlData.infoInvoice.buyer_phone || '9999999999')
            .up();
    }

    additionalInfoNode.up();

    return doc.end({ prettyPrint: true });
}