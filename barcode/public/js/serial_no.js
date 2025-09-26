frappe.ui.form.on('Serial No', {
    refresh: function(frm) {
        if (!frm.doc.__islocal) {
            frm.add_custom_button(__('Print Barcode Label'), function() {
                barcode.print_label('Serial No', frm.doc.name);
            }, __('Actions'));
        }
    }
});