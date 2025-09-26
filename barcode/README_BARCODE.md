# Barcode Label Printing App

## Features

### Core Functionality
- Print barcode labels for Items, Batches, and Serial Numbers
- Support for multiple barcode formats (1D and 2D)
- Customizable label templates
- Bulk printing capabilities
- Print logging and audit trail

### Supported Barcode Types
**1D Barcodes:**
- Code128
- Code39
- EAN-8, EAN-13
- UPC-A, UPC-E
- ITF (Interleaved 2 of 5)
- Codabar

**2D Barcodes:**
- QR Code
- Data Matrix
- PDF417
- Aztec Code

### Label Templates
- Pre-built templates for Items, Batches, and Serial Numbers
- Customizable HTML/CSS templates
- Field mapping configuration
- Default template system

## Usage

### Printing Single Labels
1. Navigate to Item/Batch/Serial No document
2. Click "Print Barcode Label" button in Actions menu
3. Select template, copies, and barcode type
4. Click Print

### Bulk Printing
1. Select multiple documents in list view
2. Use bulk actions to print labels
3. Configure template and copies
4. Print all selected items

### Delivery Note Labels
1. Open submitted Delivery Note
2. Click "Print Item Labels" in Actions menu
3. Choose to print per item or per quantity
4. Select template and print

## Configuration

### Barcode Label Settings
Access via: Setup > Barcode Label Settings

- Default label dimensions
- Default barcode type and printer
- Enable/disable printing for different doctypes
- Printer configuration for direct printing

### Label Templates
Access via: Setup > Barcode Label Template

- Create custom templates
- Configure field mappings
- Set default templates per type
- Customize HTML/CSS

## Installation

The app is automatically configured after installation with:
- Default settings
- Sample templates for each document type
- Required permissions

## API Reference

### Main Functions

```python
# Print single label
barcode.barcode.api.print_barcode_label(doctype, docname, template, copies, barcode_type)

# Bulk print
barcode.barcode.api.bulk_print_labels(doctype, docnames, template, copies)

# Get templates
barcode.barcode.api.get_templates(template_type)
```

### JavaScript Functions

```javascript
// Print single label
barcode.print_label(doctype, docname, options)

// Bulk print
barcode.bulk_print(doctype, selected_docs)
```

## Customization

### Custom Templates
1. Create new Barcode Label Template
2. Define HTML template with Jinja2 syntax
3. Add CSS for styling
4. Configure field mappings
5. Set as default if needed

### Adding Print Buttons
Add to any doctype's JavaScript:

```javascript
frappe.ui.form.on('Your DocType', {
    refresh: function(frm) {
        if (!frm.doc.__islocal) {
            frm.add_custom_button(__('Print Barcode Label'), function() {
                barcode.print_label('Your DocType', frm.doc.name);
            }, __('Actions'));
        }
    }
});
```

## Troubleshooting

### Common Issues
1. **No templates found**: Create templates via Barcode Label Template
2. **Barcode not generating**: Check barcode value and type compatibility
3. **Print not working**: Verify browser print settings and popup blockers

### Logs
Check Barcode Print Log for printing history and error messages.