import frappe

def after_install():
	"""Create default settings after installation"""
	create_default_settings()

def create_default_settings():
	"""Create default barcode label settings"""
	if not frappe.db.exists("Barcode Label Settings", "Barcode Label Settings"):
		settings = frappe.new_doc("Barcode Label Settings")
		settings.default_label_width = 50
		settings.default_label_height = 30
		settings.default_copies = 1
		settings.default_barcode_type = "Code128"
		settings.default_printer_type = "PDF"
		settings.enable_item_printing = 1
		settings.enable_batch_printing = 1
		settings.enable_serial_printing = 1
		settings.enable_delivery_note_printing = 1
		
		# Add default barcode types
		barcode_types = [
			{"barcode_type": "Code128", "is_enabled": 1, "barcode_width": 200, "barcode_height": 100},
			{"barcode_type": "Code39", "is_enabled": 1, "barcode_width": 200, "barcode_height": 100},
			{"barcode_type": "EAN-13", "is_enabled": 1, "barcode_width": 200, "barcode_height": 100},
			{"barcode_type": "QR Code", "is_enabled": 1, "barcode_width": 150, "barcode_height": 150},
		]
		
		for barcode_type in barcode_types:
			settings.append("supported_barcode_types", barcode_type)
		
		settings.save(ignore_permissions=True)
		frappe.db.commit()