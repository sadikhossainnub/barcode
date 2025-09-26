frappe.ui.form.on('Item', {
    refresh: function(frm) {
        if (!frm.doc.__islocal) {
            frm.add_custom_button(__('Print Barcode Label'), function() {
                barcode.print_label('Item', frm.doc.name);
            }, __('Actions'));
        }
    }
});