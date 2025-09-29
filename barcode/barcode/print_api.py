import frappe
import json
import io
import base64
from frappe import _
from frappe.utils import get_site_path
import os
from PIL import Image, ImageDraw, ImageFont
try:
	from barcode import Code128
	from barcode.writer import ImageWriter
except ImportError:
	Code128 = None
	try:
		import qrcode
	except ImportError:
		qrcode = None

@frappe.whitelist()
def generate_pdf_preview(template_data, copies=1):
	"""Generate PDF preview of the label"""
	try:
		template_data = json.loads(template_data) if isinstance(template_data, str) else template_data
		copies = int(copies)
		
		# Generate HTML for PDF
		html_content = generate_label_html(template_data, copies)
		
		# Create PDF using frappe's PDF generator
		try:
			from frappe.utils.pdf import get_pdf
			pdf_content = get_pdf(html_content, {'page-size': 'A4', 'margin-top': '0mm', 'margin-bottom': '0mm', 'margin-left': '0mm', 'margin-right': '0mm'})
		except Exception as pdf_error:
			# Fallback: return HTML for browser printing
			return {
				'success': True,
				'html_content': html_content,
				'message': f'PDF generation failed, using HTML preview. Error: {str(pdf_error)}'
			}
		
		# Save PDF to temp file
		import tempfile
		temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
		temp_file.write(pdf_content)
		temp_file.close()
		
		# Create downloadable URL
		file_url = f"/api/method/barcode.barcode.print_api.download_pdf?file={temp_file.name}"
		
		return {
			'success': True,
			'pdf_url': file_url,
			'message': f'PDF generated with {copies} copies'
		}
		
	except Exception as e:
		frappe.log_error(f"PDF generation error: {str(e)}")
		return {'success': False, 'error': str(e)}

@frappe.whitelist()
def send_print_command(template_data, print_settings):
	"""Send direct print command to printer"""
	try:
		template_data = json.loads(template_data) if isinstance(template_data, str) else template_data
		print_settings = json.loads(print_settings) if isinstance(print_settings, str) else print_settings
		
		mode = print_settings.get('mode', 'pdf')
		copies = int(print_settings.get('copies', 1))
		
		if mode == 'thermal':
			return send_thermal_print(template_data, print_settings, copies)
		elif mode == 'laser':
			return send_laser_print(template_data, print_settings, copies)
		else:
			# Default PDF print
			return generate_pdf_preview(template_data, copies)
			
	except Exception as e:
		frappe.log_error(f"Print command error: {str(e)}")
		return {'success': False, 'error': str(e)}

def send_thermal_print(template_data, print_settings, copies):
	"""Send ZPL command to thermal printer"""
	try:
		printer_ip = print_settings.get('printerIP')
		if not printer_ip:
			return {'success': False, 'error': 'Printer IP required for thermal printing'}
		
		# Generate ZPL commands
		zpl_commands = generate_zpl_commands(template_data, copies)
		
		# Send to printer via socket
		import socket
		sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
		sock.settimeout(5)
		sock.connect((printer_ip, 9100))
		sock.send(zpl_commands.encode())
		sock.close()
		
		return {
			'success': True,
			'message': f'Sent {copies} labels to thermal printer at {printer_ip}'
		}
		
	except Exception as e:
		return {'success': False, 'error': f'Thermal print error: {str(e)}'}

def send_laser_print(template_data, print_settings, copies):
	"""Send to system default printer"""
	try:
		# Generate HTML and convert to PDF
		html_content = generate_label_html(template_data, copies)
		
		# Use system print command (Linux/Windows compatible)
		import subprocess
		import tempfile
		
		# Create temp HTML file
		temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False)
		temp_file.write(html_content)
		temp_file.close()
		
		# Print using system command
		if os.name == 'nt':  # Windows
			subprocess.run(['start', '/min', temp_file.name], shell=True)
		else:  # Linux/Mac
			subprocess.run(['lp', temp_file.name])
		
		return {
			'success': True,
			'message': f'Sent {copies} labels to system printer'
		}
		
	except Exception as e:
		return {'success': False, 'error': f'Laser print error: {str(e)}'}

def generate_label_html(template_data, copies=1):
	"""Generate HTML content for label printing"""
	width = template_data.get('width', 50)
	height = template_data.get('height', 30)
	elements = template_data.get('elements', [])
	live_data = template_data.get('liveData')
	
	# CSS for print
	css = f"""
	<style>
		@page {{
			size: {width}mm {height}mm;
			margin: 0;
		}}
		body {{
			margin: 0;
			padding: 0;
			font-family: Arial, sans-serif;
		}}
		.label {{
			width: {width}mm;
			height: {height}mm;
			position: relative;
			background: white;
			page-break-after: always;
			border: 1px solid #000;
		}}
		.label:last-child {{
			page-break-after: avoid;
		}}
		.element {{
			position: absolute;
		}}
		@media print {{
			.label {{
				border: none;
			}}
		}}
	</style>
	"""
	
	# Generate labels
	labels_html = ""
	for copy_num in range(copies):
		labels_html += f'<div class="label">'
		
		for element in elements:
			content = get_element_content(element, live_data)
			style = f"""
				left: {element['x']}px;
				top: {element['y']}px;
				width: {element['width']}px;
				height: {element['height']}px;
				font-size: {element.get('fontSize', 12)}px;
				font-weight: {element.get('fontWeight', 'normal')};
				color: {element.get('color', '#000')};
			"""
			
			labels_html += f'<div class="element" style="{style}">{content}</div>'
		
		labels_html += '</div>'
	
	return f"""
	<!DOCTYPE html>
	<html>
	<head>
		<title>Label Print</title>
		{css}
	</head>
	<body>
		{labels_html}
	</body>
	</html>
	"""

def get_element_content(element, live_data=None):
	"""Get content for element based on type"""
	element_type = element.get('type')
	content = element.get('content', '')
	
	# Use live data if available
	if live_data and element_type in live_data:
		content = live_data[element_type]
	
	if element_type == 'barcode':
		barcode_value = live_data.get('item_code') if live_data else content
		barcode_img = generate_barcode_base64(barcode_value)
		return f'<img src="data:image/png;base64,{barcode_img}" style="max-width: 100%; height: auto;" />'
	elif element_type == 'batch_barcode':
		barcode_value = live_data.get('batch_no') if live_data else content
		barcode_img = generate_barcode_base64(barcode_value)
		return f'<img src="data:image/png;base64,{barcode_img}" style="max-width: 100%; height: auto;" />'
	elif element_type == 'serial_barcode':
		barcode_value = live_data.get('serial_no') if live_data else content
		barcode_img = generate_barcode_base64(barcode_value)
		return f'<img src="data:image/png;base64,{barcode_img}" style="max-width: 100%; height: auto;" />'
	elif element_type == 'qr':
		qr_content = element.get('qrContent', content)
		qr_img = generate_qr_base64(qr_content)
		return f'<img src="data:image/png;base64,{qr_img}" style="width: 100%; height: 100%; object-fit: contain;" />'
	elif element_type in ['logo', 'image']:
		image_url = element.get('imageUrl', '')
		if image_url:
			return f'<img src="{image_url}" style="width: 100%; height: 100%; object-fit: contain;" />'
		return f'<div style="background: #f0f0f0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px;">{content}</div>'
	elif element_type == 'line':
		return '<hr style="margin: 0; border-top: 2px solid currentColor; width: 100%;" />'
	elif element_type == 'box':
		return '<div style="width: 100%; height: 100%; border: 2px solid currentColor;"></div>'
	else:
		return content.replace('\n', '<br>') if content else ''

def generate_zpl_commands(template_data, copies=1):
	"""Generate ZPL commands for thermal printer"""
	width = int(template_data.get('width', 50) * 8)  # Convert mm to dots (203 DPI)
	height = int(template_data.get('height', 30) * 8)
	elements = template_data.get('elements', [])
	
	zpl = f"^XA^LH0,0^FS"  # Start ZPL, set label home
	zpl += f"^PW{width}^FS"  # Set print width
	
	for element in elements:
		x = int(element['x'] * 8 / 3.78)  # Convert px to dots
		y = int(element['y'] * 8 / 3.78)
		
		if element['type'] == 'barcode':
			zpl += f"^FO{x},{y}^BY2,3,50^BCN,,Y,N^FD{element.get('content', '')}^FS"
		elif element['type'] in ['text', 'custom_text']:
			font_size = max(1, int(element.get('fontSize', 12) / 4))
			zpl += f"^FO{x},{y}^A0N,{font_size},{font_size}^FD{element.get('content', '')}^FS"
	
	zpl += f"^PQ{copies}^XZ"  # Print quantity and end ZPL
	
	return zpl

@frappe.whitelist()
def print_template_direct(template_name, print_settings, sample_data=None):
	"""Print template directly from doctype"""
	try:
		template = frappe.get_doc("Barcode Label Template", template_name)
		print_settings = json.loads(print_settings) if isinstance(print_settings, str) else print_settings
		sample_data = json.loads(sample_data) if isinstance(sample_data, str) else (sample_data or {})
		
		# Convert template to print format
		template_data = {
			'name': template.template_name,
			'width': template.label_width,
			'height': template.label_height,
			'elements': parse_template_elements(template),
			'liveData': prepare_sample_data(sample_data)
		}
		
		copies = int(print_settings.get('copies', 1))
		mode = print_settings.get('mode', 'pdf_output')
		
		if mode == 'pdf_output':
			return generate_pdf_preview(template_data, copies)
		else:
			return send_print_command(template_data, print_settings)
			
	except Exception as e:
		frappe.log_error(f"Template print error: {str(e)}")
		return {'success': False, 'error': str(e)}

@frappe.whitelist()
def template_pdf_preview(template_name):
	"""Generate PDF preview from template"""
	try:
		template = frappe.get_doc("Barcode Label Template", template_name)
		
		template_data = {
			'name': template.template_name,
			'width': template.label_width,
			'height': template.label_height,
			'elements': parse_template_elements(template),
			'liveData': {
				'item_code': 'SAMPLE001',
				'item_name': 'Sample Product',
				'batch_no': 'BATCH001',
				'serial_no': 'SN001',
				'company': 'Sample Company'
			}
		}
		
		return generate_pdf_preview(template_data, 1)
		
	except Exception as e:
		return {'success': False, 'error': str(e)}

def parse_template_elements(template):
	"""Parse template HTML to extract elements"""
	try:
		# Simple parsing for basic templates
		elements = []
		
		# Add basic elements based on template fields
		if template.show_item_code:
			elements.append({
				'type': 'item_code',
				'x': 10, 'y': 10, 'width': 80, 'height': 20,
				'fontSize': 12, 'content': 'item_code'
			})
			
		if template.show_item_name:
			elements.append({
				'type': 'item_name',
				'x': 10, 'y': 35, 'width': 120, 'height': 20,
				'fontSize': 10, 'content': 'item_name'
			})
			
		if template.show_batch_no:
			elements.append({
				'type': 'batch_no',
				'x': 10, 'y': 60, 'width': 80, 'height': 15,
				'fontSize': 9, 'content': 'batch_no'
			})
			
		# Add barcode
		elements.append({
			'type': 'barcode',
			'x': 10, 'y': 80, 'width': 120, 'height': 40,
			'fontSize': 12, 'content': 'barcode'
		})
		
		return elements
		
	except Exception as e:
		frappe.log_error(f"Template parsing error: {str(e)}")
		return []

def prepare_sample_data(sample_data):
	"""Prepare sample data for printing"""
	default_data = {
		'item_code': 'SAMPLE001',
		'item_name': 'Sample Product Name',
		'batch_no': 'BATCH001',
		'serial_no': 'SN001',
		'mfg_date': '01/01/2024',
		'exp_date': '01/01/2025',
		'quantity': '10',
		'company': 'Sample Company'
	}
	
	# Override with provided sample data
	if sample_data:
		if sample_data.get('item_code'):
			item = frappe.get_doc('Item', sample_data['item_code'])
			default_data.update({
				'item_code': item.name,
				'item_name': item.item_name
			})
			
		default_data.update({
			k: v for k, v in sample_data.items() if v
		})
		
	return default_data

def generate_barcode_base64(value):
	"""Generate base64 encoded barcode image"""
	try:
		if Code128:
			code = Code128(str(value), writer=ImageWriter())
			buffer = io.BytesIO()
			code.write(buffer)
			buffer.seek(0)
			return base64.b64encode(buffer.getvalue()).decode()
		else:
			# Fallback: create simple text image
			img = Image.new('RGB', (200, 50), color='white')
			draw = ImageDraw.Draw(img)
			draw.text((10, 15), str(value), fill='black')
			buffer = io.BytesIO()
			img.save(buffer, format='PNG')
			buffer.seek(0)
			return base64.b64encode(buffer.getvalue()).decode()
	except Exception as e:
		# Simple fallback image
		img = Image.new('RGB', (200, 50), color='white')
		draw = ImageDraw.Draw(img)
		draw.text((10, 15), str(value), fill='black')
		buffer = io.BytesIO()
		img.save(buffer, format='PNG')
		buffer.seek(0)
		return base64.b64encode(buffer.getvalue()).decode()

def generate_qr_base64(value):
	"""Generate base64 encoded QR code image"""
	try:
		if qrcode:
			qr = qrcode.QRCode(version=1, box_size=10, border=5)
			qr.add_data(str(value))
			qr.make(fit=True)
			img = qr.make_image(fill_color="black", back_color="white")
			buffer = io.BytesIO()
			img.save(buffer, format='PNG')
			buffer.seek(0)
			return base64.b64encode(buffer.getvalue()).decode()
		else:
			# Fallback: create simple text image
			img = Image.new('RGB', (100, 100), color='white')
			draw = ImageDraw.Draw(img)
			draw.text((10, 40), f"QR:{str(value)[:10]}", fill='black')
			buffer = io.BytesIO()
			img.save(buffer, format='PNG')
			buffer.seek(0)
			return base64.b64encode(buffer.getvalue()).decode()
	except Exception as e:
		# Simple fallback image
		img = Image.new('RGB', (100, 100), color='white')
		draw = ImageDraw.Draw(img)
		draw.text((10, 40), f"QR:{str(value)[:10]}", fill='black')
		buffer = io.BytesIO()
		img.save(buffer, format='PNG')
		buffer.seek(0)
		return base64.b64encode(buffer.getvalue()).decode()

@frappe.whitelist()
def download_pdf(file):
	"""Download generated PDF file"""
	try:
		if os.path.exists(file):
			with open(file, 'rb') as f:
				content = f.read()
			
			# Clean up temp file
			os.unlink(file)
			
			frappe.local.response.filename = "label_preview.pdf"
			frappe.local.response.filecontent = content
			frappe.local.response.type = "download"
			
	except Exception as e:
		frappe.throw(f"File download error: {str(e)}")