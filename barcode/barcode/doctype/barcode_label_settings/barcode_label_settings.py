import frappe
from frappe.model.document import Document

class BarcodeLabelSettings(Document):
	def validate(self):
		if self.enable_direct_printing and not self.printer_ip:
			frappe.throw("Printer IP Address is required when Direct Printing is enabled")