import frappe
import json
from frappe import _
from frappe.utils import now, get_url
import io
import base64

@frappe.whitelist()
def print_barcode_label(doctype, docname, template=None, copies=1, barcode_type=None):
	"""Main API to print barcode labels"""
	try:
		# Get document
		doc = frappe.get_doc(doctype, docname)
		
		# Get settings
		settings = get_barcode_settings()
		
		# Get template
		if not template:
			template = get_default_template(doctype)
		
		template_doc = frappe.get_doc("Barcode Label Template", template)
		
		# Generate label data
		label_data = prepare_label_data(doc, doctype)
		
		# Generate barcode
		barcode_html = generate_barcode(
			label_data.get('barcode_value', ''),
			barcode_type or template_doc.barcode_type,
			template_doc.barcode_width,
			template_doc.barcode_height
		)
		
		label_data['barcode_html'] = barcode_html
		
		# Generate HTML
		html_content = render_label_html(template_doc, label_data)
		
		# Log the print
		log_print_activity(doc, template_doc, copies, barcode_type or template_doc.barcode_type)
		
		return {
			'success': True,
			'html': html_content,
			'copies': copies,
			'template': template
		}
		
	except Exception as e:
		frappe.log_error(f"Barcode printing error: {str(e)}")
		return {
			'success': False,
			'error': str(e)
		}

def get_barcode_settings():
	"""Get barcode label settings"""
	if not frappe.db.exists("Barcode Label Settings", "Barcode Label Settings"):
		# Create default settings
		settings = frappe.new_doc("Barcode Label Settings")
		settings.save(ignore_permissions=True)
		frappe.db.commit()
	
	return frappe.get_single("Barcode Label Settings")

def get_default_template(doctype):
	"""Get default template for doctype"""
	template_type_map = {
		'Item': 'Item',
		'Batch': 'Batch',
		'Serial No': 'Serial No',
		'Delivery Note': 'General'
	}
	
	template_type = template_type_map.get(doctype, 'General')
	
	template = frappe.db.get_value(
		"Barcode Label Template",
		{"template_type": template_type, "is_default": 1},
		"name"
	)
	
	if not template:
		template = frappe.db.get_value(
			"Barcode Label Template",
			{"template_type": template_type},
			"name"
		)
	
	if not template:
		frappe.throw(_("No template found for {0}").format(template_type))
	
	return template

def prepare_label_data(doc, doctype):
	"""Prepare data for label rendering"""
	data = {}
	
	if doctype == "Item":
		data.update({
			'item_code': doc.item_code,
			'item_name': doc.item_name,
			'barcode_value': doc.item_code,
			'company': frappe.defaults.get_user_default("Company")
		})
	
	elif doctype == "Batch":
		item = frappe.get_doc("Item", doc.item)
		data.update({
			'item_code': doc.item,
			'item_name': item.item_name,
			'batch_no': doc.name,
			'mfg_date': doc.manufacturing_date,
			'exp_date': doc.expiry_date,
			'barcode_value': doc.name,
			'company': frappe.defaults.get_user_default("Company")
		})
	
	elif doctype == "Serial No":
		item = frappe.get_doc("Item", doc.item_code)
		data.update({
			'item_code': doc.item_code,
			'item_name': item.item_name,
			'serial_no': doc.name,
			'barcode_value': doc.name,
			'company': frappe.defaults.get_user_default("Company")
		})
	
	return data

def generate_barcode(value, barcode_type, width=200, height=100):
	"""Generate barcode HTML using ERPNext's built-in barcode functionality"""
	if not value:
		return ""
	
	# Use ERPNext's barcode route
	barcode_url = f"/barcode?type={barcode_type}&value={value}&width={width}&height={height}"
	
	return f'<img src="{barcode_url}" alt="{value}" class="barcode-image" />'

def render_label_html(template_doc, data):
	"""Render label HTML using template"""
	if template_doc.html_template:
		html = frappe.render_template(template_doc.html_template, data)
	else:
		html = frappe.render_template(template_doc.get_default_html_template(), data)
	
	# Add CSS
	css = template_doc.css_styles or get_default_css(template_doc)
	
	full_html = f"""
	<style>
	{css}
	</style>
	{html}
	"""
	
	return full_html

def get_default_css(template_doc):
	"""Get default CSS for label"""
	return f"""
	.barcode-label {{
		width: {template_doc.label_width}mm;
		height: {template_doc.label_height}mm;
		padding: 2mm;
		font-family: Arial, sans-serif;
		font-size: 8pt;
		border: 1px solid #000;
		text-align: center;
	}}
	.item-code {{ font-weight: bold; font-size: 10pt; }}
	.item-name {{ font-size: 9pt; margin: 1mm 0; }}
	.batch-no, .serial-no {{ font-size: 8pt; }}
	.mfg-date, .exp-date {{ font-size: 7pt; }}
	.barcode {{ margin: 2mm 0; }}
	.barcode-image {{ max-width: 100%; height: auto; }}
	"""

def log_print_activity(doc, template_doc, copies, barcode_type):
	"""Log print activity"""
	log = frappe.new_doc("Barcode Print Log")
	log.update({
		'user': frappe.session.user,
		'reference_doctype': doc.doctype,
		'reference_name': doc.name,
		'template_used': template_doc.name,
		'copies_printed': copies,
		'barcode_type': barcode_type,
		'print_status': 'Success'
	})
	
	if doc.doctype == "Item":
		log.item_code = doc.item_code
		log.item_name = doc.item_name
	elif doc.doctype == "Batch":
		log.item_code = doc.item
		log.batch_no = doc.name
	elif doc.doctype == "Serial No":
		log.item_code = doc.item_code
		log.serial_no = doc.name
	
	log.save(ignore_permissions=True)
	frappe.db.commit()

@frappe.whitelist()
def get_templates(template_type=None):
	"""Get available templates"""
	filters = {}
	if template_type:
		filters['template_type'] = template_type
	
	templates = frappe.get_all(
		"Barcode Label Template",
		filters=filters,
		fields=['name', 'template_name', 'template_type', 'is_default']
	)
	
	return templates

@frappe.whitelist()
def bulk_print_labels(doctype, docnames, template=None, copies=1):
	"""Bulk print labels for multiple documents"""
	results = []
	docnames = json.loads(docnames) if isinstance(docnames, str) else docnames
	
	for docname in docnames:
		result = print_barcode_label(doctype, docname, template, copies)
		results.append({
			'docname': docname,
			'success': result.get('success', False),
			'error': result.get('error')
		})
	
	return results