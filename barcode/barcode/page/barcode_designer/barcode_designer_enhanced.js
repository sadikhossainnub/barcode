frappe.pages['barcode-designer'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Barcode Designer',
		single_column: true
	});

	frappe.require([
		'/assets/frappe/js/lib/jquery/jquery-ui.min.js'
	], function() {
		frappe.barcode_designer = new EnhancedBarcodeDesigner(wrapper);
		$(wrapper).bind('show', function() {
			frappe.barcode_designer.show();
		});
	});
}

class EnhancedBarcodeDesigner {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.page = wrapper.page;
		this.history = [];
		this.historyIndex = -1;
		this.snapToGrid = false;
		this.gridSize = 10;
		this.make();
	}

	make() {
		this.setup_toolbar();
		this.setup_designer();
		this.setup_interactions();
		this.setup_advanced_tools();
		this.setup_keyboard_shortcuts();
		this.load_templates();
	}

	setup_toolbar() {
		this.page.set_primary_action('Save Template', () => this.save_template());
		this.page.add_menu_item('New Template', () => this.new_template());
		this.page.add_menu_item('Load Template', () => this.load_template_dialog());
		this.page.add_menu_item('Preview', () => this.preview_label());
		this.page.add_menu_item('Export JSON', () => this.export_template());
		this.page.add_menu_item('Import JSON', () => this.import_template());
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
						<h4>Data Fields</h4>
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

					<div class="design-tools">
						<h4>Design Elements</h4>
						<button class="btn btn-sm btn-primary btn-block" id="add-text">📝 Add Text</button>
						<button class="btn btn-sm btn-primary btn-block" id="add-line">➖ Add Line</button>
						<button class="btn btn-sm btn-primary btn-block" id="add-box">⬜ Add Box</button>
						<button class="btn btn-sm btn-primary btn-block" id="add-image">🖼️ Add Image</button>
						
						<h5 style="margin-top: 15px;">Alignment</h5>
						<div class="btn-group btn-group-sm" style="width: 100%;">
							<button class="btn btn-default" id="align-left">⬅️</button>
							<button class="btn btn-default" id="align-center">↔️</button>
							<button class="btn btn-default" id="align-right">➡️</button>
						</div>
						
						<h5 style="margin-top: 15px;">Actions</h5>
						<button class="btn btn-sm btn-info btn-block" id="duplicate">📋 Duplicate</button>
						<button class="btn btn-sm btn-danger btn-block" id="delete-selected">🗑️ Delete</button>
					</div>
				</div>

				<div class="designer-canvas">
					<div class="canvas-toolbar">
						<div class="toolbar-left">
							<button class="btn btn-sm btn-default" id="zoom-in">🔍+</button>
							<button class="btn btn-sm btn-default" id="zoom-out">🔍-</button>
							<button class="btn btn-sm btn-default" id="reset-zoom">100%</button>
							<span class="zoom-level">100%</span>
						</div>
						<div class="toolbar-right">
							<button class="btn btn-sm btn-success" id="snap-to-grid">📐 Snap</button>
							<button class="btn btn-sm btn-info" id="show-rulers">📏 Rulers</button>
							<button class="btn btn-sm btn-warning" id="undo">↶ Undo</button>
							<button class="btn btn-sm btn-warning" id="redo">↷ Redo</button>
						</div>
					</div>
					<div class="canvas-container">
						<div class="label-canvas" id="label-canvas">
							<div class="canvas-grid"></div>
							<div class="drop-zone">
								<p>🎨 Design your label here</p>
								<small>Drag fields or use design tools</small>
							</div>
						</div>
					</div>
				</div>

				<div class="properties-panel">
					<h4>Properties</h4>
					<div id="element-properties">
						<p>Select an element to edit properties</p>
					</div>
					
					<div class="layers-panel">
						<h4>Layers</h4>
						<div id="layers-list">
							<p>No elements</p>
						</div>
					</div>

					<div class="barcode-settings">
						<h4>Barcode Settings</h4>
						<div class="form-group">
							<label>Type</label>
							<select class="form-control form-control-sm" id="barcode-type">
								<option value="Code128">Code128</option>
								<option value="Code39">Code39</option>
								<option value="EAN-13">EAN-13</option>
								<option value="QR Code">QR Code</option>
							</select>
						</div>
						<div class="form-group">
							<label>Width (px)</label>
							<input type="number" class="form-control form-control-sm" id="barcode-width" value="200">
						</div>
						<div class="form-group">
							<label>Height (px)</label>
							<input type="number" class="form-control form-control-sm" id="barcode-height" value="100">
						</div>
					</div>
				</div>
			</div>
		`);
	}

	setup_interactions() {
		const canvas = $(this.wrapper).find('#label-canvas');
		const self = this;

		// Field addition
		$(this.wrapper).find('.add-field').on('click', function() {
			const fieldType = $(this).closest('.field-item').data('field');
			self.add_field_to_canvas(fieldType);
		});

		// Canvas interactions
		canvas.on('click', function(e) {
			if (e.target === this) {
				$('.canvas-element').removeClass('selected');
				self.clear_properties();
			}
		});

		// Dimension changes
		$(this.wrapper).find('#label-width, #label-height').on('input', () => {
			this.update_canvas_size();
		});

		this.update_canvas_size();
	}

	setup_advanced_tools() {
		// Design tools
		$(this.wrapper).find('#add-text').on('click', () => this.add_text_element());
		$(this.wrapper).find('#add-line').on('click', () => this.add_line_element());
		$(this.wrapper).find('#add-box').on('click', () => this.add_box_element());
		$(this.wrapper).find('#add-image').on('click', () => this.add_image_element());

		// Alignment
		$(this.wrapper).find('#align-left').on('click', () => this.align_elements('left'));
		$(this.wrapper).find('#align-center').on('click', () => this.align_elements('center'));
		$(this.wrapper).find('#align-right').on('click', () => this.align_elements('right'));

		// Actions
		$(this.wrapper).find('#duplicate').on('click', () => this.duplicate_selected());
		$(this.wrapper).find('#delete-selected').on('click', () => this.delete_selected());

		// Toolbar
		$(this.wrapper).find('#zoom-in').on('click', () => this.zoom(1.2));
		$(this.wrapper).find('#zoom-out').on('click', () => this.zoom(0.8));
		$(this.wrapper).find('#reset-zoom').on('click', () => this.reset_zoom());
		$(this.wrapper).find('#snap-to-grid').on('click', () => this.toggle_snap_to_grid());
		$(this.wrapper).find('#show-rulers').on('click', () => this.toggle_rulers());
		$(this.wrapper).find('#undo').on('click', () => this.undo());
		$(this.wrapper).find('#redo').on('click', () => this.redo());
	}

	setup_keyboard_shortcuts() {
		$(document).on('keydown', (e) => {
			if ($(e.target).is('input, textarea, [contenteditable]')) return;
			
			if (e.ctrlKey || e.metaKey) {
				switch(e.key) {
					case 'z': e.preventDefault(); this.undo(); break;
					case 'y': e.preventDefault(); this.redo(); break;
					case 'd': e.preventDefault(); this.duplicate_selected(); break;
					case 's': e.preventDefault(); this.save_template(); break;
				}
			}
			if (e.key === 'Delete') {
				this.delete_selected();
			}
		});
	}

	add_field_to_canvas(fieldType) {
		const element = this.create_field_element(fieldType);
		$(this.wrapper).find('#label-canvas').append(element);
		this.make_element_interactive(element);
		this.save_state();
		this.update_layers();
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
			fontWeight: fieldConfig.fontWeight || 'normal',
			minWidth: '30px',
			minHeight: '20px'
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
		
		element.draggable({
			containment: '#label-canvas',
			grid: this.snapToGrid ? [this.gridSize, this.gridSize] : false,
			stop: function() {
				self.save_state();
			}
		});

		element.resizable({
			handles: 'se',
			stop: function() {
				self.save_state();
			}
		});

		element.on('click', function(e) {
			e.stopPropagation();
			$('.canvas-element').removeClass('selected');
			$(this).addClass('selected');
			self.show_element_properties($(this));
		});

		element.find('.delete-element').on('click', function(e) {
			e.stopPropagation();
			element.remove();
			self.save_state();
			self.update_layers();
		});
	}

	add_text_element() {
		const element = $(`
			<div class="canvas-element text-element" data-field="custom_text">
				<div class="element-content" contenteditable="true">Custom Text</div>
				<div class="element-controls">
					<button class="btn btn-xs btn-danger delete-element">×</button>
				</div>
			</div>
		`);

		element.css({
			position: 'absolute',
			left: '20px',
			top: '20px',
			border: '1px dashed #007bff',
			padding: '5px',
			background: 'white',
			cursor: 'move',
			fontSize: '12px',
			minWidth: '50px'
		});

		$(this.wrapper).find('#label-canvas').append(element);
		this.make_element_interactive(element);
		this.save_state();
		this.update_layers();
	}

	add_line_element() {
		const element = $(`
			<div class="canvas-element line-element" data-field="line">
				<div class="element-content"><hr style="margin:0; border-top: 2px solid #000; width: 100%;"></div>
				<div class="element-controls">
					<button class="btn btn-xs btn-danger delete-element">×</button>
				</div>
			</div>
		`);

		element.css({
			position: 'absolute',
			left: '20px',
			top: '40px',
			width: '100px',
			height: '5px',
			cursor: 'move'
		});

		$(this.wrapper).find('#label-canvas').append(element);
		this.make_element_interactive(element);
		this.save_state();
		this.update_layers();
	}

	add_box_element() {
		const element = $(`
			<div class="canvas-element box-element" data-field="box">
				<div class="element-content"></div>
				<div class="element-controls">
					<button class="btn btn-xs btn-danger delete-element">×</button>
				</div>
			</div>
		`);

		element.css({
			position: 'absolute',
			left: '20px',
			top: '60px',
			width: '80px',
			height: '40px',
			border: '2px solid #000',
			background: 'transparent',
			cursor: 'move'
		});

		$(this.wrapper).find('#label-canvas').append(element);
		this.make_element_interactive(element);
		this.save_state();
		this.update_layers();
	}

	show_element_properties(element) {
		const fieldType = element.data('field');
		const properties = $(this.wrapper).find('#element-properties');
		
		properties.html(`
			<div class="form-group">
				<label><strong>${fieldType}</strong></label>
			</div>
			<div class="form-group">
				<label>Font Size</label>
				<input type="number" class="form-control form-control-sm element-font-size" value="${parseInt(element.css('font-size'))}">
			</div>
			<div class="form-group">
				<label>Font Weight</label>
				<select class="form-control form-control-sm element-font-weight">
					<option value="normal" ${element.css('font-weight') === 'normal' ? 'selected' : ''}>Normal</option>
					<option value="bold" ${element.css('font-weight') === 'bold' ? 'selected' : ''}>Bold</option>
				</select>
			</div>
			<div class="form-group">
				<label>Text Align</label>
				<select class="form-control form-control-sm element-text-align">
					<option value="left">Left</option>
					<option value="center">Center</option>
					<option value="right">Right</option>
				</select>
			</div>
			<div class="form-group">
				<label>Border</label>
				<select class="form-control form-control-sm element-border">
					<option value="none">None</option>
					<option value="1px solid #000">Solid</option>
					<option value="1px dashed #000">Dashed</option>
				</select>
			</div>
		`);

		const self = this;
		properties.find('.element-font-size').on('input', function() {
			element.css('font-size', $(this).val() + 'px');
			self.save_state();
		});

		properties.find('.element-font-weight').on('change', function() {
			element.css('font-weight', $(this).val());
			self.save_state();
		});

		properties.find('.element-text-align').on('change', function() {
			element.css('text-align', $(this).val());
			self.save_state();
		});

		properties.find('.element-border').on('change', function() {
			element.css('border', $(this).val());
			self.save_state();
		});
	}

	clear_properties() {
		$(this.wrapper).find('#element-properties').html('<p>Select an element to edit properties</p>');
	}

	align_elements(alignment) {
		const selected = $(this.wrapper).find('.canvas-element.selected');
		if (selected.length === 0) return;

		const canvas = $(this.wrapper).find('#label-canvas');
		const canvasWidth = canvas.width();

		selected.each(function() {
			const $el = $(this);
			const width = $el.width();
			
			switch(alignment) {
				case 'left':
					$el.css('left', '5px');
					break;
				case 'center':
					$el.css('left', (canvasWidth - width) / 2 + 'px');
					break;
				case 'right':
					$el.css('left', (canvasWidth - width - 5) + 'px');
					break;
			}
		});
		
		this.save_state();
	}

	duplicate_selected() {
		const selected = $(this.wrapper).find('.canvas-element.selected');
		if (selected.length === 0) return;

		const self = this;
		selected.each(function() {
			const $el = $(this);
			const clone = $el.clone();
			const pos = $el.position();
			
			clone.css({
				left: (pos.left + 10) + 'px',
				top: (pos.top + 10) + 'px'
			});
			
			$(self.wrapper).find('#label-canvas').append(clone);
			self.make_element_interactive(clone);
		});
		
		this.save_state();
		this.update_layers();
	}

	delete_selected() {
		const selected = $(this.wrapper).find('.canvas-element.selected');
		if (selected.length === 0) return;
		
		selected.remove();
		this.save_state();
		this.update_layers();
		this.clear_properties();
	}

	update_canvas_size() {
		const width = $(this.wrapper).find('#label-width').val();
		const height = $(this.wrapper).find('#label-height').val();
		const canvas = $(this.wrapper).find('#label-canvas');
		
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

	update_layers() {
		const layersList = $(this.wrapper).find('#layers-list');
		layersList.empty();
		
		const elements = $(this.wrapper).find('.canvas-element');
		if (elements.length === 0) {
			layersList.html('<p><small>No elements</small></p>');
			return;
		}
		
		const self = this;
		elements.each(function(i) {
			const $el = $(this);
			const field = $el.data('field') || 'Element';
			const layerItem = $(`
				<div class="layer-item">
					<small>${field}</small>
					<div class="layer-controls">
						<button class="btn btn-xs btn-outline-primary select-layer">👁</button>
						<button class="btn btn-xs btn-outline-danger delete-layer">×</button>
					</div>
				</div>
			`);
			
			layerItem.find('.select-layer').on('click', () => {
				$('.canvas-element').removeClass('selected');
				$el.addClass('selected');
				self.show_element_properties($el);
			});
			
			layerItem.find('.delete-layer').on('click', () => {
				$el.remove();
				self.update_layers();
				self.save_state();
			});
			
			layersList.append(layerItem);
		});
	}

	toggle_snap_to_grid() {
		this.snapToGrid = !this.snapToGrid;
		const btn = $(this.wrapper).find('#snap-to-grid');
		btn.toggleClass('btn-success btn-outline-success');
	}

	toggle_rulers() {
		const canvas = $(this.wrapper).find('#label-canvas');
		canvas.toggleClass('show-rulers');
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

	save_state() {
		const state = this.get_canvas_state();
		this.history = this.history.slice(0, this.historyIndex + 1);
		this.history.push(JSON.stringify(state));
		this.historyIndex++;
		
		if (this.history.length > 50) {
			this.history.shift();
			this.historyIndex--;
		}
	}

	get_canvas_state() {
		const elements = [];
		$(this.wrapper).find('.canvas-element').each(function() {
			const $el = $(this);
			elements.push({
				html: $el[0].outerHTML
			});
		});
		return elements;
	}

	undo() {
		if (this.historyIndex > 0) {
			this.historyIndex--;
			this.restore_state(JSON.parse(this.history[this.historyIndex]));
		}
	}

	redo() {
		if (this.historyIndex < this.history.length - 1) {
			this.historyIndex++;
			this.restore_state(JSON.parse(this.history[this.historyIndex]));
		}
	}

	restore_state(state) {
		const canvas = $(this.wrapper).find('#label-canvas');
		canvas.find('.canvas-element').remove();
		
		const self = this;
		state.forEach(elementData => {
			const element = $(elementData.html);
			canvas.append(element);
			self.make_element_interactive(element);
		});
		
		this.update_layers();
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
				if (r.message && r.message.success) {
					frappe.show_alert({message: 'Template saved successfully', indicator: 'green'});
				} else {
					frappe.msgprint('Error: ' + (r.message?.error || 'Unknown error'));
				}
			}
		});
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
				textAlign: $el.css('text-align'),
				border: $el.css('border')
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

	preview_label() {
		const templateData = this.generate_template_data();
		
		frappe.call({
			method: 'barcode.barcode.api.preview_visual_template',
			args: { template_data: templateData },
			callback: function(r) {
				if (r.message && r.message.success) {
					const preview = window.open('', '_blank', 'width=800,height=600');
					preview.document.write(r.message.html);
					preview.document.close();
				}
			}
		});
	}

	show() {
		this.save_state();
	}

	load_templates() {
		// Load existing templates
	}
}