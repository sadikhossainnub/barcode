import frappe
import json
from frappe import _

@frappe.whitelist()
def save_advanced_template(template_data):
	"""Save advanced template with professional features"""
	try:
		template_data = json.loads(template_data) if isinstance(template_data, str) else template_data
		
		# Generate advanced HTML and CSS
		html_template, css_styles = generate_advanced_template(template_data)
		
		# Create or update template
		if frappe.db.exists("Barcode Label Template", template_data['name']):
			template = frappe.get_doc("Barcode Label Template", template_data['name'])
		else:
			template = frappe.new_doc("Barcode Label Template")
			template.template_name = template_data['name']
		
		template.update({
			'template_type': template_data['template_type'],
			'label_width': template_data['label_width'],
			'label_height': template_data['label_height'],
			'html_template': html_template,
			'css_styles': css_styles
		})
		
		template.save()
		frappe.db.commit()
		
		return {'success': True, 'name': template.name}
		
	except Exception as e:
		frappe.log_error(f"Advanced template save error: {str(e)}")
		return {'success': False, 'error': str(e)}

@frappe.whitelist()
def get_template_library():
	"""Get template library with categories"""
	return {
		'categories': [
			{
				'name': 'Industrial',
				'templates': [
					{'name': 'Heavy Duty Label', 'preview': '/assets/barcode/img/industrial.png'},
					{'name': 'Warehouse Tag', 'preview': '/assets/barcode/img/warehouse.png'}
				]
			},
			{
				'name': 'Retail',
				'templates': [
					{'name': 'Price Tag', 'preview': '/assets/barcode/img/price.png'},
					{'name': 'Product Label', 'preview': '/assets/barcode/img/product.png'}
				]
			},
			{
				'name': 'Medical',
				'templates': [
					{'name': 'Patient Wristband', 'preview': '/assets/barcode/img/medical.png'},
					{'name': 'Sample Label', 'preview': '/assets/barcode/img/sample.png'}
				]
			}
		]
	}

@frappe.whitelist()
def export_template_package(template_names):
	"""Export multiple templates as a package"""
	template_names = json.loads(template_names) if isinstance(template_names, str) else template_names
	
	package = {
		'version': '1.0',
		'created': frappe.utils.now(),
		'templates': []
	}
	
	for name in template_names:
		template = frappe.get_doc("Barcode Label Template", name)
		package['templates'].append({
			'name': template.template_name,
			'type': template.template_type,
			'width': template.label_width,
			'height': template.label_height,
			'html': template.html_template,
			'css': template.css_styles
		})
	
	return {'success': True, 'package': package}

@frappe.whitelist()
def import_template_package(package_data):
	"""Import template package"""
	try:
		package = json.loads(package_data) if isinstance(package_data, str) else package_data
		imported = []
		
		for template_data in package['templates']:
			template = frappe.new_doc("Barcode Label Template")
			template.update({
				'template_name': template_data['name'],
				'template_type': template_data['type'],
				'label_width': template_data['width'],
				'label_height': template_data['height'],
				'html_template': template_data['html'],
				'css_styles': template_data['css']
			})
			template.save()
			imported.append(template.name)
		
		frappe.db.commit()
		return {'success': True, 'imported': imported}
		
	except Exception as e:
		return {'success': False, 'error': str(e)}

@frappe.whitelist()
def generate_batch_labels(items_data, template_name, options=None):
	"""Generate labels for multiple items in batch"""
	try:
		items_data = json.loads(items_data) if isinstance(items_data, str) else items_data
		options = json.loads(options) if isinstance(options, str) else (options or {})
		
		template = frappe.get_doc("Barcode Label Template", template_name)
		labels = []
		
		for item_data in items_data:
			# Generate barcode
			barcode_html = generate_barcode(
				item_data.get('barcode_value', ''),
				template.barcode_type,
				template.barcode_width,
				template.barcode_height
			)
			
			item_data['barcode_html'] = barcode_html
			
			# Render template
			html = frappe.render_template(template.html_template, item_data)
			labels.append({
				'html': html,
				'css': template.css_styles,
				'item': item_data.get('item_code', ''),
				'copies': item_data.get('copies', 1)
			})
		
		return {'success': True, 'labels': labels}
		
	except Exception as e:
		return {'success': False, 'error': str(e)}

def generate_advanced_template(template_data):
	"""Generate HTML and CSS for advanced templates"""
	elements = template_data.get('elements', [])
	
	# Base styles
	css_parts = [f"""
.barcode-label {{
	position: relative;
	width: {template_data['label_width']}mm;
	height: {template_data['label_height']}mm;
	background: {template_data.get('background_color', '#ffffff')};
	border: 1px {template_data.get('border_style', 'solid')} #000;
	font-family: Arial, sans-serif;
	overflow: hidden;
}}
"""]
	
	html_parts = ['<div class="barcode-label">']
	
	for i, element in enumerate(elements):
		class_name = f"element-{i}"
		element_type = element.get('type', 'field')
		
		# Generate element HTML
		if element_type == 'text':
			config = element.get('config', {})
			html_parts.append(f'<div class="{class_name}">{config.get("content", "")}</div>')
		elif element_type == 'qr':
			html_parts.append(f'<div class="{class_name}">{{{{ qr_code_html }}}}</div>')
		elif element_type == 'table':
			config = element.get('config', {})
			table_html = generate_table_html(config)
			html_parts.append(f'<div class="{class_name}">{table_html}</div>')
		else:
			field = element.get('field', '')
			html_parts.append(f'<div class="{class_name}">{{{{ {field} }}}}</div>')
		
		# Generate element CSS
		css_parts.append(f"""
.{class_name} {{
	position: absolute;
	left: {element['x']}px;
	top: {element['y']}px;
	width: {element['width']}px;
	height: {element['height']}px;
	z-index: {element.get('zIndex', 1)};
}}""")
		
		# Add type-specific styles
		if element_type == 'text':
			config = element.get('config', {})
			css_parts.append(f"""
.{class_name} {{
	font-size: {config.get('fontSize', '12px')};
	font-weight: {config.get('fontWeight', 'normal')};
	color: {config.get('color', '#000000')};
	display: flex;
	align-items: center;
	justify-content: center;
}}""")
	
	html_parts.append('</div>')
	
	return '\n'.join(html_parts), '\n'.join(css_parts)

def generate_table_html(config):
	"""Generate HTML for table element"""
	rows = config.get('rows', 2)
	cols = config.get('cols', 2)
	
	html = '<table style="width: 100%; border-collapse: collapse;">'
	for i in range(rows):
		html += '<tr>'
		for j in range(cols):
			html += f'<td style="border: 1px solid #000; padding: 2px; font-size: 10px;">Cell {i+1},{j+1}</td>'
		html += '</tr>'
	html += '</table>'
	
	return html

def generate_barcode(value, barcode_type, width=200, height=100):
	"""Generate barcode HTML"""
	if not value:
		return ""
	
	barcode_url = f"/barcode?type={barcode_type}&value={value}&width={width}&height={height}"
	return f'<img src="{barcode_url}" alt="{value}" style="max-width: 100%; height: auto;" />'