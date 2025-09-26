frappe.ui.form.on('Delivery Note', {
    refresh: function(frm) {
        if (!frm.doc.__islocal && frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Print Item Labels'), function() {
                print_delivery_note_labels(frm);
            }, __('Actions'));
        }
    }
});

function print_delivery_note_labels(frm) {
    let items = frm.doc.items || [];
    if (items.length === 0) {
        frappe.msgprint(__('No items found in this delivery note'));
        return;
    }

    let dialog = new frappe.ui.Dialog({
        title: __('Print Item Labels'),
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'items_info',
                options: `<p>${__('Items in delivery note')}: ${items.length}</p>`
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
                            template_type: ['in', ['Item', 'General']]
                        }
                    };
                }
            },
            {
                fieldtype: 'Int',
                fieldname: 'copies_per_qty',
                label: __('Print Labels per Quantity'),
                default: 0,
                description: __('If checked, will print one label per quantity unit')
            }
        ],
        primary_action_label: __('Print Labels'),
        primary_action: function(values) {
            print_dn_item_labels(frm, values);
            dialog.hide();
        }
    });

    dialog.show();
}

function print_dn_item_labels(frm, values) {
    let print_jobs = [];
    
    frm.doc.items.forEach(item => {
        let copies = values.copies_per_qty ? item.qty : 1;
        for (let i = 0; i < copies; i++) {
            print_jobs.push({
                doctype: 'Item',
                docname: item.item_code,
                template: values.template
            });
        }
    });

    // Process print jobs
    frappe.call({
        method: 'barcode.barcode.api.bulk_print_labels',
        args: {
            doctype: 'Item',
            docnames: print_jobs.map(job => job.docname),
            template: values.template,
            copies: 1
        },
        callback: function(r) {
            if (r.message) {
                frappe.show_alert({
                    message: __('Printed labels for delivery note items'),
                    indicator: 'green'
                });
            }
        }
    });
}