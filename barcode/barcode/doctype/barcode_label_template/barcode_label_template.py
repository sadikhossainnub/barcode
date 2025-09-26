import frappe
from frappe.model.document import Document

class BarcodeLabelTemplate(Document):
	def validate(self):
		if self.is_default:
			# Ensure only one default template per type
			existing_default = frappe.db.get_value(
				"Barcode Label Template",
				{"template_type": self.template_type, "is_default": 1, "name": ["!=", self.name]},
				"name"
			)
			if existing_default:
				frappe.throw(f"Default template already exists for {self.template_type}: {existing_default}")
	
	def get_default_html_template(self):
		"""Generate default HTML template based on field selections"""
		html = '<div class="barcode-label">'
		
		if self.show_item_code:
			html += '<div class="item-code">{{ item_code }}</div>'
		if self.show_item_name:
			html += '<div class="item-name">{{ item_name }}</div>'
		if self.show_batch_no:
			html += '<div class="batch-no">Batch: {{ batch_no }}</div>'
		if self.show_serial_no:
			html += '<div class="serial-no">Serial: {{ serial_no }}</div>'
		if self.show_mfg_date:
			html += '<div class="mfg-date">MFG: {{ mfg_date }}</div>'
		if self.show_exp_date:
			html += '<div class="exp-date">EXP: {{ exp_date }}</div>'
		if self.show_quantity:
			html += '<div class="quantity">Qty: {{ quantity }}</div>'
		if self.show_company:
			html += '<div class="company">{{ company }}</div>'
		
		html += '<div class="barcode">{{ barcode_html }}</div>'
		html += '</div>'
		
		return html