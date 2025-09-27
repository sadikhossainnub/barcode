frappe.ui.form.on('Barcode Label Template', {
    refresh: function(frm) {
        if (!frm.doc.__islocal) {
            frm.add_custom_button(__('🖨️ Print Test'), function() {
                show_print_dialog(frm);
            }, __('Actions'));

            frm.add_custom_button(__('📄 PDF Preview'), function() {
                generate_pdf_preview(frm);
            }, __('Actions'));

            frm.add_custom_button(__('🎨 Visual Designer'), function() {
                frappe.set_route('barcode-designer');
            }, __('Actions'));
        }
    }
});

function show_print_dialog(frm) {
    let dialog = new frappe.ui.Dialog({
        title: __('Print Label Template'),
        fields: [
            {
                fieldtype: 'Section Break',
                label: __('Print Settings')
            },
            {
                fieldtype: 'Int',
                fieldname: 'copies',
                label: __('Number of Copies'),
                default: 1,
                reqd: 1
            },
            {
                fieldtype: 'Select',
                fieldname: 'print_mode',
                label: __('Print Mode'),
                options: 'PDF Output\nThermal Printer\nLaser Printer',
                default: 'PDF Output',
                reqd: 1
            },
            {
                fieldtype: 'Data',
                fieldname: 'printer_ip',
                label: __('Printer IP'),
                depends_on: 'eval:doc.print_mode=="Thermal Printer"'
            },
            {
                fieldtype: 'Section Break',
                label: __('Sample Data')
            },
            {
                fieldtype: 'Link',
                fieldname: 'sample_item',
                label: __('Sample Item'),
                options: 'Item',
                description: __('Select item for sample data')
            },
            {
                fieldtype: 'Data',
                fieldname: 'sample_batch',
                label: __('Sample Batch'),
                default: 'BATCH001'
            },
            {
                fieldtype: 'Data',
                fieldname: 'sample_serial',
                label: __('Sample Serial'),
                default: 'SN001'
            }
        ],
        primary_action_label: __('Print'),
        primary_action: function(values) {
            print_template(frm, values);
            dialog.hide();
        }
    });

    dialog.show();
}

function print_template(frm, values) {
    frappe.call({
        method: 'barcode.barcode.api.print_template_direct',
        args: {
            template_name: frm.doc.name,
            print_settings: {
                copies: values.copies,
                mode: values.print_mode.toLowerCase().replace(' ', '_'),
                printerIP: values.printer_ip
            },
            sample_data: {
                item_code: values.sample_item,
                batch_no: values.sample_batch,
                serial_no: values.sample_serial
            }
        },
        callback: function(r) {
            if (r.message && r.message.success) {
                if (r.message.pdf_url) {
                    window.open(r.message.pdf_url, '_blank');
                }
                frappe.show_alert({
                    message: r.message.message || __('Print job completed'),
                    indicator: 'green'
                });
            } else {
                frappe.msgprint({
                    title: __('Print Error'),
                    message: r.message?.error || __('Failed to print template'),
                    indicator: 'red'
                });
            }
        }
    });
}

function generate_pdf_preview(frm) {
    frappe.call({
        method: 'barcode.barcode.api.template_pdf_preview',
        args: {
            template_name: frm.doc.name
        },
        callback: function(r) {
            if (r.message && r.message.success) {
                window.open(r.message.pdf_url, '_blank');
            } else {
                frappe.msgprint('Error: ' + (r.message?.error || 'Unknown error'));
            }
        }
    });
}