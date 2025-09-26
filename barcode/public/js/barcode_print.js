frappe.provide('barcode');

barcode.print_label = function(doctype, docname, options = {}) {
    // Show print dialog
    let dialog = new frappe.ui.Dialog({
        title: __('Print Barcode Label'),
        fields: [
            {
                fieldtype: 'Link',
                fieldname: 'template',
                label: __('Template'),
                options: 'Barcode Label Template',
                reqd: 1,
                get_query: function() {
                    return {
                        filters: {
                            template_type: ['in', [get_template_type(doctype), 'General']]
                        }
                    };
                }
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
                fieldname: 'barcode_type',
                label: __('Barcode Type'),
                options: 'Code128\nCode39\nEAN-8\nEAN-13\nUPC-A\nUPC-E\nITF\nCodabar\nQR Code\nData Matrix\nPDF417\nAztec Code'
            }
        ],
        primary_action_label: __('Print'),
        primary_action: function(values) {
            print_barcode_label(doctype, docname, values);
            dialog.hide();
        }
    });

    // Load default template
    frappe.call({
        method: 'barcode.barcode.api.get_templates',
        args: {
            template_type: get_template_type(doctype)
        },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                let default_template = r.message.find(t => t.is_default) || r.message[0];
                dialog.set_value('template', default_template.name);
            }
        }
    });

    dialog.show();
};

function get_template_type(doctype) {
    const type_map = {
        'Item': 'Item',
        'Batch': 'Batch',
        'Serial No': 'Serial No',
        'Delivery Note': 'General'
    };
    return type_map[doctype] || 'General';
}

function print_barcode_label(doctype, docname, values) {
    frappe.call({
        method: 'barcode.barcode.api.print_barcode_label',
        args: {
            doctype: doctype,
            docname: docname,
            template: values.template,
            copies: values.copies,
            barcode_type: values.barcode_type
        },
        callback: function(r) {
            if (r.message && r.message.success) {
                // Open print preview
                let print_window = window.open('', '_blank');
                print_window.document.write(`
                    <html>
                    <head>
                        <title>Barcode Label</title>
                        <style>
                            body { margin: 0; padding: 10px; }
                            @media print {
                                body { margin: 0; padding: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        ${r.message.html.repeat(values.copies)}
                        <script>
                            window.onload = function() {
                                window.print();
                            };
                        </script>
                    </body>
                    </html>
                `);
                print_window.document.close();
                
                frappe.show_alert({
                    message: __('Label printed successfully'),
                    indicator: 'green'
                });
            } else {
                frappe.msgprint({
                    title: __('Print Error'),
                    message: r.message.error || __('Failed to print label'),
                    indicator: 'red'
                });
            }
        }
    });
}

// Bulk print function
barcode.bulk_print = function(doctype, selected_docs) {
    if (!selected_docs || selected_docs.length === 0) {
        frappe.msgprint(__('Please select documents to print'));
        return;
    }

    let dialog = new frappe.ui.Dialog({
        title: __('Bulk Print Barcode Labels'),
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'selected_info',
                options: `<p>${__('Selected documents')}: ${selected_docs.length}</p>`
            },
            {
                fieldtype: 'Link',
                fieldname: 'template',
                label: __('Template'),
                options: 'Barcode Label Template',
                reqd: 1,
                get_query: function() {
                    return {
                        filters: {
                            template_type: ['in', [get_template_type(doctype), 'General']]
                        }
                    };
                }
            },
            {
                fieldtype: 'Int',
                fieldname: 'copies',
                label: __('Copies per Label'),
                default: 1,
                reqd: 1
            }
        ],
        primary_action_label: __('Print All'),
        primary_action: function(values) {
            bulk_print_labels(doctype, selected_docs, values);
            dialog.hide();
        }
    });

    dialog.show();
};

function bulk_print_labels(doctype, docnames, values) {
    frappe.call({
        method: 'barcode.barcode.api.bulk_print_labels',
        args: {
            doctype: doctype,
            docnames: docnames,
            template: values.template,
            copies: values.copies
        },
        callback: function(r) {
            if (r.message) {
                let success_count = r.message.filter(result => result.success).length;
                let total_count = r.message.length;
                
                frappe.show_alert({
                    message: __('Printed {0} of {1} labels successfully', [success_count, total_count]),
                    indicator: success_count === total_count ? 'green' : 'orange'
                });
            }
        }
    });
}