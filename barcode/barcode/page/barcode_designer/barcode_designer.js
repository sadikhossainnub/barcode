frappe.pages['barcode-designer'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Barcode Designer',
		single_column: true
	});

	// Load jQuery UI if not already loaded
	frappe.require([
		'/assets/frappe/js/lib/jquery/jquery-ui.min.js'
	], function() {
		frappe.barcode_designer = new BarcodeDesigner(wrapper);
		$(wrapper).bind('show', function() {
			frappe.barcode_designer.show();
		});
	});
}

class BarcodeDesigner {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.page = wrapper.page;
		this.make();
	}

	make() {
		this.setup_toolbar();
		this.setup_designer();
		this.load_templates();
	}

	setup_toolbar() {
		this.page.set_primary_action('Save Template', () => this.save_template());
		this.page.add_menu_item('New Template', () => this.new_template());
		this.page.add_menu_item('Load Template', () => this.load_template_dialog());
		this.page.add_menu_item('Preview', () => this.preview_label());
	}

	setup_designer() {
		$(this.wrapper).find('.layout-main-section').html(`
			<div class="barcode-designer-container">
				<div class="designer-sidebar">
					<div class="template-info">
						<h4>Template Settings</h4>
						<div class="form-group">
							<label>Template Name</label>
							<input type="text" class="form-control" id="template-name" placeholder="Enter template name">
						</div>
						<div class="form-group">
							<label>Template Type</label>
							<select class="form-control" id="template-type">
								<option value="Item">Item</option>
								<option value="Batch">Batch</option>
								<option value="Serial No">Serial No</option>
								<option value="General">General</option>
							</select>
						</div>
						<div class="form-group">
							<label>Label Width (mm)</label>
							<input type="number" class="form-control" id="label-width" value="50">
						</div>
						<div class="form-group">
							<label>Label Height (mm)</label>
							<input type="number" class="form-control" id="label-height" value="30">
						</div>
					</div>

					<div class="field-options">
						<h4>Available Fields</h4>
						<div class="field-list">
							<div class="field-item" data-field="item_code">
								<span class="field-name">Item Code</span>
								<button class="btn btn-xs btn-primary add-field">Add</button>
							</div>
							<div class="field-item" data-field="item_name">
								<span class="field-name">Item Name</span>
								<button class="btn btn-xs btn-primary add-field">Add</button>
							</div>
							<div class="field-item" data-field="batch_no">
								<span class="field-name">Batch No</span>
								<button class="btn btn-xs btn-primary add-field">Add</button>
							</div>
							<div class="field-item" data-field="serial_no">
								<span class="field-name">Serial No</span>
								<button class="btn btn-xs btn-primary add-field">Add</button>
							</div>
							<div class="field-item" data-field="mfg_date">
								<span class="field-name">MFG Date</span>
								<button class="btn btn-xs btn-primary add-field">Add</button>
							</div>
							<div class="field-item" data-field="exp_date">
								<span class="field-name">EXP Date</span>
								<button class="btn btn-xs btn-primary add-field">Add</button>
							</div>
							<div class="field-item" data-field="quantity">
								<span class="field-name">Quantity</span>
								<button class="btn btn-xs btn-primary add-field">Add</button>
							</div>
							<div class="field-item" data-field="company">
								<span class="field-name">Company</span>
								<button class="btn btn-xs btn-primary add-field">Add</button>
							</div>
							<div class="field-item" data-field="barcode">
								<span class="field-name">Barcode</span>
								<button class="btn btn-xs btn-primary add-field">Add</button>
							</div>
						</div>
					</div>

					<div class="barcode-settings">
						<h4>Barcode Settings</h4>
						<div class="form-group">
							<label>Barcode Type</label>
							<select class="form-control" id="barcode-type">
								<option value="Code128">Code128</option>
								<option value="Code39">Code39</option>
								<option value="EAN-13">EAN-13</option>
								<option value="QR Code">QR Code</option>
							</select>
						</div>
						<div class="form-group">
							<label>Barcode Width (px)</label>
							<input type="number" class="form-control" id="barcode-width" value="200">
						</div>
						<div class="form-group">
							<label>Barcode Height (px)</label>
							<input type="number" class="form-control" id="barcode-height" value="100">
						</div>
					</div>
				</div>

				<div class="designer-canvas">
					<div class="canvas-toolbar">
						<button class="btn btn-sm btn-default" id="zoom-in">Zoom In</button>
						<button class="btn btn-sm btn-default" id="zoom-out">Zoom Out</button>
						<button class="btn btn-sm btn-default" id="reset-zoom">Reset</button>
						<span class="zoom-level">100%</span>
					</div>
					<div class="canvas-container">
						<div class="label-canvas" id="label-canvas">
							<div class="canvas-grid"></div>
							<div class="drop-zone">
								<p>Drag fields here to design your label</p>
							</div>
						</div>
					</div>
				</div>

				<div class="properties-panel">
					<h4>Element Properties</h4>
					<div id="element-properties">
						<p>Select an element to edit properties</p>
					</div>
				</div>
			</div>
		`);

		this.setup_interactions();
	}

	setup_interactions() {
		const canvas = $(this.wrapper).find('#label-canvas');
		const self = this;

		// Make fields draggable
		$(this.wrapper).find('.add-field').on('click', function() {
			const fieldType = $(this).closest('.field-item').data('field');
			self.add_field_to_canvas(fieldType);
		});

		// Canvas drop functionality
		canvas.on('dragover', function(e) {
			e.preventDefault();
		});

		canvas.on('drop', function(e) {
			e.preventDefault();
			const fieldType = e.originalEvent.dataTransfer.getData('text/plain');
			const rect = canvas[0].getBoundingClientRect();
			const x = e.originalEvent.clientX - rect.left;
			const y = e.originalEvent.clientY - rect.top;
			self.add_field_at_position(fieldType, x, y);
		});

		// Zoom controls
		$(this.wrapper).find('#zoom-in').on('click', () => this.zoom(1.2));
		$(this.wrapper).find('#zoom-out').on('click', () => this.zoom(0.8));
		$(this.wrapper).find('#reset-zoom').on('click', () => this.reset_zoom());

		// Update canvas size when dimensions change
		$(this.wrapper).find('#label-width, #label-height').on('input', () => {
			this.update_canvas_size();
		});

		this.update_canvas_size();
	}

	add_field_to_canvas(fieldType) {
		const canvas = $(this.wrapper).find('#label-canvas');
		const element = this.create_field_element(fieldType);
		canvas.append(element);
		this.make_element_interactive(element);
	}

	create_field_element(fieldType) {
		const fieldConfig = this.get_field_config(fieldType);
		const element = $(`
			<div class="canvas-element" data-field="${fieldType}">
				<div class="element-content">${fieldConfig.sample}</div>
				<div class="element-controls">
					<button class="btn btn-xs btn-danger delete-element">×</button>
				</div>
			</div>
		`);

		element.css({
			position: 'absolute',
			left: '10px',
			top: '10px',
			border: '1px dashed #ccc',
			padding: '5px',
			background: 'white',
			cursor: 'move',
			fontSize: fieldConfig.fontSize || '12px',
			fontWeight: fieldConfig.fontWeight || 'normal'
		});

		return element;
	}

	get_field_config(fieldType) {
		const configs = {
			item_code: { sample: 'ITEM001', fontSize: '14px', fontWeight: 'bold' },
			item_name: { sample: 'Sample Item Name', fontSize: '12px' },
			batch_no: { sample: 'BATCH001', fontSize: '11px' },
			serial_no: { sample: 'SN001', fontSize: '11px' },
			mfg_date: { sample: 'MFG: 01/01/2024', fontSize: '10px' },
			exp_date: { sample: 'EXP: 01/01/2025', fontSize: '10px' },
			quantity: { sample: 'Qty: 10', fontSize: '11px' },
			company: { sample: 'Company Name', fontSize: '10px' },
			barcode: { sample: '||||| |||| |||||', fontSize: '16px', fontFamily: 'monospace' }
		};
		return configs[fieldType] || { sample: fieldType, fontSize: '12px' };
	}

	make_element_interactive(element) {
		const self = this;
		
		// Make draggable
		element.draggable({
			containment: '#label-canvas',
			stop: function() {
				self.update_element_properties($(this));
			}
		});

		// Make resizable
		element.resizable({
			handles: 'se',
			stop: function() {
				self.update_element_properties($(this));
			}
		});

		// Click to select
		element.on('click', function(e) {
			e.stopPropagation();
			$('.canvas-element').removeClass('selected');
			$(this).addClass('selected');
			self.show_element_properties($(this));
		});

		// Delete button
		element.find('.delete-element').on('click', function(e) {
			e.stopPropagation();
			element.remove();
		});
	}

	show_element_properties(element) {
		const fieldType = element.data('field');
		const properties = $(this.wrapper).find('#element-properties');
		
		properties.html(`
			<div class="form-group">
				<label>Field: ${fieldType}</label>
			</div>
			<div class="form-group">
				<label>Font Size</label>
				<input type="number" class="form-control element-font-size" value="${parseInt(element.css('font-size'))}">
			</div>
			<div class="form-group">
				<label>Font Weight</label>
				<select class="form-control element-font-weight">
					<option value="normal" ${element.css('font-weight') === 'normal' ? 'selected' : ''}>Normal</option>
					<option value="bold" ${element.css('font-weight') === 'bold' ? 'selected' : ''}>Bold</option>
				</select>
			</div>
			<div class="form-group">
				<label>Text Align</label>
				<select class="form-control element-text-align">
					<option value="left" ${element.css('text-align') === 'left' ? 'selected' : ''}>Left</option>
					<option value="center" ${element.css('text-align') === 'center' ? 'selected' : ''}>Center</option>
					<option value="right" ${element.css('text-align') === 'right' ? 'selected' : ''}>Right</option>
				</select>
			</div>
		`);

		// Bind property changes
		properties.find('.element-font-size').on('input', function() {
			element.css('font-size', $(this).val() + 'px');
		});

		properties.find('.element-font-weight').on('change', function() {
			element.css('font-weight', $(this).val());
		});

		properties.find('.element-text-align').on('change', function() {
			element.css('text-align', $(this).val());
		});
	}

	update_canvas_size() {
		const width = $(this.wrapper).find('#label-width').val();
		const height = $(this.wrapper).find('#label-height').val();
		const canvas = $(this.wrapper).find('#label-canvas');
		
		// Convert mm to pixels (assuming 96 DPI)
		const pxWidth = (width * 96) / 25.4;
		const pxHeight = (height * 96) / 25.4;
		
		canvas.css({
			width: pxWidth + 'px',
			height: pxHeight + 'px',
			border: '2px solid #333',
			position: 'relative',
			background: 'white',
			margin: '20px auto'
		});
	}

	zoom(factor) {
		this.zoomLevel = (this.zoomLevel || 1) * factor;
		const canvas = $(this.wrapper).find('#label-canvas');
		canvas.css('transform', `scale(${this.zoomLevel})`);
		$(this.wrapper).find('.zoom-level').text(Math.round(this.zoomLevel * 100) + '%');
	}

	reset_zoom() {
		this.zoomLevel = 1;
		const canvas = $(this.wrapper).find('#label-canvas');
		canvas.css('transform', 'scale(1)');
		$(this.wrapper).find('.zoom-level').text('100%');
	}

	generate_template_data() {
		const elements = [];
		$(this.wrapper).find('.canvas-element').each(function() {
			const $el = $(this);
			const position = $el.position();
			elements.push({
				field: $el.data('field'),
				x: position.left,
				y: position.top,
				width: $el.width(),
				height: $el.height(),
				fontSize: $el.css('font-size'),
				fontWeight: $el.css('font-weight'),
				textAlign: $el.css('text-align')
			});
		});

		return {
			name: $(this.wrapper).find('#template-name').val(),
			template_type: $(this.wrapper).find('#template-type').val(),
			label_width: $(this.wrapper).find('#label-width').val(),
			label_height: $(this.wrapper).find('#label-height').val(),
			barcode_type: $(this.wrapper).find('#barcode-type').val(),
			barcode_width: $(this.wrapper).find('#barcode-width').val(),
			barcode_height: $(this.wrapper).find('#barcode-height').val(),
			elements: elements
		};
	}

	save_template() {
		const templateData = this.generate_template_data();
		
		if (!templateData.name) {
			frappe.msgprint('Please enter a template name');
			return;
		}

		frappe.call({
			method: 'barcode.barcode.api.save_visual_template',
			args: { template_data: templateData },
			callback: function(r) {
				if (r.message.success) {
					frappe.show_alert('Template saved successfully');
				} else {
					frappe.msgprint('Error saving template: ' + r.message.error);
				}
			}
		});
	}

	preview_label() {
		const templateData = this.generate_template_data();
		
		frappe.call({
			method: 'barcode.barcode.api.preview_visual_template',
			args: { template_data: templateData },
			callback: function(r) {
				if (r.message.success) {
					const preview = window.open('', '_blank');
					preview.document.write(r.message.html);
					preview.document.close();
				}
			}
		});
	}

	show() {
		// Called when page is shown
	}

	load_templates() {
		// Load existing templates for editing
	}
}