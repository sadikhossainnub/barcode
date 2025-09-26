frappe.ui.form.on('Batch', {
    refresh: function(frm) {
        if (!frm.doc.__islocal) {
            frm.add_custom_button(__('Print Barcode Label'), function() {
                barcode.print_label('Batch', frm.doc.name);
            }, __('Actions'));
        }
    }
});