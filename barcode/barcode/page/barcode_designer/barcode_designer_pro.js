frappe.pages['barcode-designer'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Professional Barcode Designer',
		single_column: true
	});

	frappe.require([
		'/assets/frappe/js/lib/jquery/jquery-ui.min.js'
	], function() {
		frappe.barcode_designer = new ProBarcodeDesigner(wrapper);
		$(wrapper).bind('show', function() {
			frappe.barcode_designer.show();
		});
	});
}

class ProBarcodeDesigner {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.page = wrapper.page;
		this.history = [];
		this.historyIndex = -1;
		this.snapToGrid = false;
		this.gridSize = 5;
		this.zoomLevel = 1;
		this.selectedElements = [];
		this.clipboard = null;
		this.make();
	}

	make() {
		this.setup_toolbar();
		this.setup_designer();
		this.setup_interactions();
		this.setup_advanced_tools();
		this.setup_keyboard_shortcuts();
		this.setup_context_menu();
	}

	setup_toolbar() {
		this.page.set_primary_action('💾 Save Template', () => this.save_template());
		this.page.add_menu_item('🆕 New Template', () => this.new_template());
		this.page.add_menu_item('📂 Load Template', () => this.load_template_dialog());
		this.page.add_menu_item('👁️ Preview', () => this.preview_label());
		this.page.add_menu_item('📤 Export JSON', () => this.export_template());
		this.page.add_menu_item('📥 Import JSON', () => this.import_template());
		this.page.add_menu_item('🖨️ Print Test', () => this.print_test());
	}

	setup_designer() {
		$(this.wrapper).find('.layout-main-section').html(`
			<div class="pro-designer-container">
				<div class="designer-sidebar">
					<div class="sidebar-tabs">
						<button class="tab-btn active" data-tab="template">📋 Template</button>
						<button class="tab-btn" data-tab="elements">🧩 Elements</button>
						<button class="tab-btn" data-tab="styles">🎨 Styles</button>
					</div>

					<div class="tab-content active" id="template-tab">
						<h4>Template Settings</h4>
						<div class="form-group">
							<label>Template Name</label>
							<input type="text" class="form-control" id="template-name">
						</div>
						<div class="form-group">
							<label>Type</label>
							<select class="form-control" id="template-type">
								<option value="Item">Item</option>
								<option value="Batch">Batch</option>
								<option value="Serial No">Serial No</option>
								<option value="General">General</option>
							</select>
						</div>
						<div class="row">
							<div class="col-6">
								<label>Width (mm)</label>
								<input type="number" class="form-control" id="label-width" value="50">
							</div>
							<div class="col-6">
								<label>Height (mm)</label>
								<input type="number" class="form-control" id="label-height" value="30">
							</div>
						</div>
						<div class="form-group">
							<label>Background Color</label>
							<input type="color" class="form-control" id="bg-color" value="#ffffff">
						</div>
						<div class="form-group">
							<label>Border Style</label>
							<select class="form-control" id="border-style">
								<option value="none">None</option>
								<option value="solid">Solid</option>
								<option value="dashed">Dashed</option>
								<option value="dotted">Dotted</option>
							</select>
						</div>
					</div>

					<div class="tab-content" id="elements-tab">
						<h4>Data Fields</h4>
						<div class="element-grid">
							<button class="element-btn" data-field="item_code">📦 Item Code</button>
							<button class="element-btn" data-field="item_name">🏷️ Item Name</button>
							<button class="element-btn" data-field="batch_no">🔢 Batch No</button>
							<button class="element-btn" data-field="serial_no">🆔 Serial No</button>
							<button class="element-btn" data-field="mfg_date">📅 MFG Date</button>
							<button class="element-btn" data-field="exp_date">⏰ EXP Date</button>
							<button class="element-btn" data-field="quantity">📊 Quantity</button>
							<button class="element-btn" data-field="company">🏢 Company</button>
							<button class="element-btn" data-field="barcode">📱 Barcode</button>
						</div>
						
						<h4>Design Elements</h4>
						<div class="element-grid">
							<button class="element-btn" id="add-text">📝 Text</button>
							<button class="element-btn" id="add-line">➖ Line</button>
							<button class="element-btn" id="add-box">⬜ Box</button>
							<button class="element-btn" id="add-circle">⭕ Circle</button>
							<button class="element-btn" id="add-image">🖼️ Image</button>
							<button class="element-btn" id="add-qr">📱 QR Code</button>
							<button class="element-btn" id="add-table">📋 Table</button>
							<button class="element-btn" id="add-logo">🏢 Logo</button>
						</div>
					</div>

					<div class="tab-content" id="styles-tab">
						<h4>Quick Styles</h4>
						<div class="style-presets">
							<button class="preset-btn" data-preset="minimal">Minimal</button>
							<button class="preset-btn" data-preset="modern">Modern</button>
							<button class="preset-btn" data-preset="classic">Classic</button>
							<button class="preset-btn" data-preset="industrial">Industrial</button>
						</div>
						
						<h4>Color Themes</h4>
						<div class="color-themes">
							<div class="theme-item" data-theme="blue" style="background: linear-gradient(45deg, #007bff, #0056b3)"></div>
							<div class="theme-item" data-theme="green" style="background: linear-gradient(45deg, #28a745, #1e7e34)"></div>
							<div class="theme-item" data-theme="red" style="background: linear-gradient(45deg, #dc3545, #c82333)"></div>
							<div class="theme-item" data-theme="purple" style="background: linear-gradient(45deg, #6f42c1, #59359a)"></div>
						</div>
					</div>
				</div>

				<div class="designer-canvas">
					<div class="canvas-toolbar">
						<div class="toolbar-section">
							<button class="btn btn-sm" id="zoom-in">🔍+</button>
							<button class="btn btn-sm" id="zoom-out">🔍-</button>
							<button class="btn btn-sm" id="zoom-fit">📐 Fit</button>
							<span class="zoom-display">100%</span>
						</div>
						
						<div class="toolbar-section">
							<button class="btn btn-sm toggle-btn" id="snap-grid">📐 Snap</button>
							<button class="btn btn-sm toggle-btn" id="show-rulers">📏 Rulers</button>
							<button class="btn btn-sm toggle-btn" id="show-guides">📐 Guides</button>
						</div>
						
						<div class="toolbar-section">
							<button class="btn btn-sm" id="align-left">⬅️</button>
							<button class="btn btn-sm" id="align-center">↔️</button>
							<button class="btn btn-sm" id="align-right">➡️</button>
							<button class="btn btn-sm" id="align-top">⬆️</button>
							<button class="btn btn-sm" id="align-middle">↕️</button>
							<button class="btn btn-sm" id="align-bottom">⬇️</button>
						</div>
						
						<div class="toolbar-section">
							<button class="btn btn-sm" id="group">🔗 Group</button>
							<button class="btn btn-sm" id="ungroup">🔓 Ungroup</button>
							<button class="btn btn-sm" id="bring-front">⬆️ Front</button>
							<button class="btn btn-sm" id="send-back">⬇️ Back</button>
						</div>
						
						<div class="toolbar-section">
							<button class="btn btn-sm" id="undo">↶</button>
							<button class="btn btn-sm" id="redo">↷</button>
							<button class="btn btn-sm" id="copy">📋</button>
							<button class="btn btn-sm" id="paste">📄</button>
						</div>
					</div>
					
					<div class="canvas-container">
						<div class="canvas-rulers" id="rulers"></div>
						<div class="label-canvas" id="label-canvas">
							<div class="canvas-grid"></div>
							<div class="selection-box" id="selection-box"></div>
							<div class="drop-zone">
								<div class="drop-icon">🎨</div>
								<h3>Professional Label Designer</h3>
								<p>Drag elements here or use the toolbar</p>
							</div>
						</div>
					</div>
				</div>

				<div class="properties-panel">
					<div class="panel-tabs">
						<button class="tab-btn active" data-tab="properties">⚙️ Properties</button>
						<button class="tab-btn" data-tab="layers">📚 Layers</button>
						<button class="tab-btn" data-tab="history">🕐 History</button>
					</div>

					<div class="tab-content active" id="properties-panel">
						<div id="element-properties">
							<div class="no-selection">
								<div class="icon">🎯</div>
								<p>Select an element to edit properties</p>
							</div>
						</div>
					</div>

					<div class="tab-content" id="layers-panel">
						<div class="layers-header">
							<h4>Layers</h4>
							<button class="btn btn-xs" id="add-layer">➕</button>
						</div>
						<div id="layers-list"></div>
					</div>

					<div class="tab-content" id="history-panel">
						<h4>History</h4>
						<div id="history-list"></div>
					</div>
				</div>
			</div>

			<div class="context-menu" id="context-menu">
				<div class="menu-item" data-action="copy">📋 Copy</div>
				<div class="menu-item" data-action="paste">📄 Paste</div>
				<div class="menu-item" data-action="duplicate">📑 Duplicate</div>
				<div class="menu-separator"></div>
				<div class="menu-item" data-action="bring-front">⬆️ Bring to Front</div>
				<div class="menu-item" data-action="send-back">⬇️ Send to Back</div>
				<div class="menu-separator"></div>
				<div class="menu-item" data-action="group">🔗 Group</div>
				<div class="menu-item" data-action="ungroup">🔓 Ungroup</div>
				<div class="menu-separator"></div>
				<div class="menu-item" data-action="delete">🗑️ Delete</div>
			</div>
		`);
	}

	setup_interactions() {
		const self = this;

		// Tab switching
		$(this.wrapper).find('.tab-btn').on('click', function() {
			const tab = $(this).data('tab');
			$(this).siblings().removeClass('active');
			$(this).addClass('active');
			$(`.tab-content`).removeClass('active');
			$(`#${tab}-tab, #${tab}-panel`).addClass('active');
		});

		// Element buttons
		$(this.wrapper).find('.element-btn').on('click', function() {
			const field = $(this).data('field');
			if (field) {
				self.add_field_element(field);
			}
		});

		// Canvas interactions
		const canvas = $(this.wrapper).find('#label-canvas');
		canvas.on('mousedown', (e) => this.start_selection(e));
		canvas.on('contextmenu', (e) => this.show_context_menu(e));

		// Dimension changes
		$(this.wrapper).find('#label-width, #label-height').on('input', () => {
			this.update_canvas_size();
		});

		// Background and border
		$(this.wrapper).find('#bg-color').on('change', () => this.update_canvas_style());
		$(this.wrapper).find('#border-style').on('change', () => this.update_canvas_style());

		this.update_canvas_size();
	}

	setup_advanced_tools() {
		// Design elements
		$(this.wrapper).find('#add-text').on('click', () => this.add_text_element());
		$(this.wrapper).find('#add-line').on('click', () => this.add_line_element());
		$(this.wrapper).find('#add-box').on('click', () => this.add_box_element());
		$(this.wrapper).find('#add-circle').on('click', () => this.add_circle_element());
		$(this.wrapper).find('#add-image').on('click', () => this.add_image_element());
		$(this.wrapper).find('#add-qr').on('click', () => this.add_qr_element());
		$(this.wrapper).find('#add-table').on('click', () => this.add_table_element());
		$(this.wrapper).find('#add-logo').on('click', () => this.add_logo_element());

		// Zoom controls
		$(this.wrapper).find('#zoom-in').on('click', () => this.zoom(1.2));
		$(this.wrapper).find('#zoom-out').on('click', () => this.zoom(0.8));
		$(this.wrapper).find('#zoom-fit').on('click', () => this.zoom_to_fit());

		// Toggle tools
		$(this.wrapper).find('#snap-grid').on('click', () => this.toggle_snap());
		$(this.wrapper).find('#show-rulers').on('click', () => this.toggle_rulers());
		$(this.wrapper).find('#show-guides').on('click', () => this.toggle_guides());

		// Alignment
		$(this.wrapper).find('#align-left').on('click', () => this.align_elements('left'));
		$(this.wrapper).find('#align-center').on('click', () => this.align_elements('center'));
		$(this.wrapper).find('#align-right').on('click', () => this.align_elements('right'));
		$(this.wrapper).find('#align-top').on('click', () => this.align_elements('top'));
		$(this.wrapper).find('#align-middle').on('click', () => this.align_elements('middle'));
		$(this.wrapper).find('#align-bottom').on('click', () => this.align_elements('bottom'));

		// Grouping and layering
		$(this.wrapper).find('#group').on('click', () => this.group_elements());
		$(this.wrapper).find('#ungroup').on('click', () => this.ungroup_elements());
		$(this.wrapper).find('#bring-front').on('click', () => this.bring_to_front());
		$(this.wrapper).find('#send-back').on('click', () => this.send_to_back());

		// Edit actions
		$(this.wrapper).find('#undo').on('click', () => this.undo());
		$(this.wrapper).find('#redo').on('click', () => this.redo());
		$(this.wrapper).find('#copy').on('click', () => this.copy_elements());
		$(this.wrapper).find('#paste').on('click', () => this.paste_elements());

		// Style presets
		$(this.wrapper).find('.preset-btn').on('click', function() {
			const preset = $(this).data('preset');
			self.apply_style_preset(preset);
		});

		// Color themes
		$(this.wrapper).find('.theme-item').on('click', function() {
			const theme = $(this).data('theme');
			self.apply_color_theme(theme);
		});
	}

	setup_keyboard_shortcuts() {
		$(document).on('keydown', (e) => {
			if ($(e.target).is('input, textarea, [contenteditable]')) return;
			
			if (e.ctrlKey || e.metaKey) {
				switch(e.key) {
					case 'z': e.preventDefault(); this.undo(); break;
					case 'y': e.preventDefault(); this.redo(); break;
					case 'c': e.preventDefault(); this.copy_elements(); break;
					case 'v': e.preventDefault(); this.paste_elements(); break;
					case 'd': e.preventDefault(); this.duplicate_selected(); break;
					case 's': e.preventDefault(); this.save_template(); break;
					case 'a': e.preventDefault(); this.select_all(); break;
					case 'g': e.preventDefault(); this.group_elements(); break;
				}
			}
			
			switch(e.key) {
				case 'Delete': this.delete_selected(); break;
				case 'Escape': this.clear_selection(); break;
				case 'ArrowUp': e.preventDefault(); this.move_selected(0, -1); break;
				case 'ArrowDown': e.preventDefault(); this.move_selected(0, 1); break;
				case 'ArrowLeft': e.preventDefault(); this.move_selected(-1, 0); break;
				case 'ArrowRight': e.preventDefault(); this.move_selected(1, 0); break;
			}
		});
	}

	setup_context_menu() {
		const menu = $(this.wrapper).find('#context-menu');
		
		menu.find('.menu-item').on('click', (e) => {
			const action = $(e.target).data('action');
			this.execute_context_action(action);
			this.hide_context_menu();
		});

		$(document).on('click', () => this.hide_context_menu());
	}

	add_field_element(fieldType) {
		const config = this.get_field_config(fieldType);
		const element = this.create_element('field', fieldType, config);
		this.add_to_canvas(element);
	}

	add_text_element() {
		const element = this.create_element('text', 'custom_text', {
			content: 'Custom Text',
			fontSize: '14px',
			fontWeight: 'normal',
			color: '#000000'
		});
		this.add_to_canvas(element);
	}

	add_qr_element() {
		const element = this.create_element('qr', 'qr_code', {
			content: 'QR Code',
			size: '80px',
			errorLevel: 'M'
		});
		this.add_to_canvas(element);
	}

	add_table_element() {
		const element = this.create_element('table', 'data_table', {
			rows: 3,
			cols: 2,
			cellPadding: '5px',
			borderWidth: '1px'
		});
		this.add_to_canvas(element);
	}

	create_element(type, field, config) {
		const id = 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
		
		const element = $(`
			<div class="canvas-element ${type}-element" data-type="${type}" data-field="${field}" data-id="${id}">
				<div class="element-content">${this.render_element_content(type, config)}</div>
				<div class="element-handles">
					<div class="handle nw"></div>
					<div class="handle ne"></div>
					<div class="handle sw"></div>
					<div class="handle se"></div>
				</div>
				<div class="element-controls">
					<button class="control-btn edit-btn">✏️</button>
					<button class="control-btn delete-btn">🗑️</button>
				</div>
			</div>
		`);

		element.css({
			position: 'absolute',
			left: '20px',
			top: '20px',
			minWidth: '30px',
			minHeight: '20px',
			border: '1px solid #007bff',
			background: 'rgba(255,255,255,0.9)',
			cursor: 'move'
		});

		element.data('config', config);
		this.make_element_interactive(element);
		return element;
	}

	render_element_content(type, config) {
		switch(type) {
			case 'text':
				return `<span style="font-size: ${config.fontSize}; font-weight: ${config.fontWeight}; color: ${config.color};">${config.content}</span>`;
			case 'qr':
				return `<div style="width: ${config.size}; height: ${config.size}; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px;">QR</div>`;
			case 'table':
				let table = '<table style="width: 100%; border-collapse: collapse;">';
				for(let i = 0; i < config.rows; i++) {
					table += '<tr>';
					for(let j = 0; j < config.cols; j++) {
						table += `<td style="border: ${config.borderWidth} solid #000; padding: ${config.cellPadding};">Cell ${i+1},${j+1}</td>`;
					}
					table += '</tr>';
				}
				table += '</table>';
				return table;
			default:
				return config.sample || config.content || type;
		}
	}

	make_element_interactive(element) {
		const self = this;
		
		element.draggable({
			containment: '#label-canvas',
			grid: this.snapToGrid ? [this.gridSize, this.gridSize] : false,
			stop: () => this.save_state()
		});

		element.on('click', function(e) {
			e.stopPropagation();
			if (!e.ctrlKey) self.clear_selection();
			self.select_element($(this));
		});

		element.find('.delete-btn').on('click', (e) => {
			e.stopPropagation();
			element.remove();
			this.save_state();
		});

		element.find('.edit-btn').on('click', (e) => {
			e.stopPropagation();
			this.edit_element(element);
		});
	}

	show_element_properties(element) {
		const type = element.data('type');
		const config = element.data('config') || {};
		const properties = $(this.wrapper).find('#element-properties');
		
		let html = `<h5>${type.toUpperCase()} Properties</h5>`;
		
		// Common properties
		html += `
			<div class="prop-group">
				<label>Position</label>
				<div class="row">
					<div class="col-6">
						<input type="number" class="form-control form-control-sm prop-x" value="${parseInt(element.css('left'))}" placeholder="X">
					</div>
					<div class="col-6">
						<input type="number" class="form-control form-control-sm prop-y" value="${parseInt(element.css('top'))}" placeholder="Y">
					</div>
				</div>
			</div>
			<div class="prop-group">
				<label>Size</label>
				<div class="row">
					<div class="col-6">
						<input type="number" class="form-control form-control-sm prop-width" value="${element.width()}" placeholder="Width">
					</div>
					<div class="col-6">
						<input type="number" class="form-control form-control-sm prop-height" value="${element.height()}" placeholder="Height">
					</div>
				</div>
			</div>
		`;

		// Type-specific properties
		if (type === 'text') {
			html += `
				<div class="prop-group">
					<label>Text</label>
					<input type="text" class="form-control form-control-sm prop-text" value="${config.content || ''}">
				</div>
				<div class="prop-group">
					<label>Font Size</label>
					<input type="number" class="form-control form-control-sm prop-font-size" value="${parseInt(config.fontSize)}">
				</div>
				<div class="prop-group">
					<label>Color</label>
					<input type="color" class="form-control form-control-sm prop-color" value="${config.color || '#000000'}">
				</div>
			`;
		}

		properties.html(html);
		this.bind_property_events(element);
	}

	bind_property_events(element) {
		const self = this;
		const props = $(this.wrapper).find('#element-properties');
		
		props.find('.prop-x').on('input', function() {
			element.css('left', $(this).val() + 'px');
			self.save_state();
		});

		props.find('.prop-y').on('input', function() {
			element.css('top', $(this).val() + 'px');
			self.save_state();
		});

		props.find('.prop-width').on('input', function() {
			element.width($(this).val());
			self.save_state();
		});

		props.find('.prop-height').on('input', function() {
			element.height($(this).val());
			self.save_state();
		});

		props.find('.prop-text').on('input', function() {
			const config = element.data('config') || {};
			config.content = $(this).val();
			element.data('config', config);
			element.find('.element-content').html(self.render_element_content(element.data('type'), config));
			self.save_state();
		});
	}

	select_element(element) {
		element.addClass('selected');
		this.selectedElements.push(element);
		this.show_element_properties(element);
	}

	clear_selection() {
		$('.canvas-element').removeClass('selected');
		this.selectedElements = [];
		$(this.wrapper).find('#element-properties').html('<div class="no-selection"><div class="icon">🎯</div><p>Select an element to edit properties</p></div>');
	}

	save_state() {
		const state = this.get_canvas_state();
		this.history = this.history.slice(0, this.historyIndex + 1);
		this.history.push(JSON.stringify(state));
		this.historyIndex++;
		
		if (this.history.length > 100) {
			this.history.shift();
			this.historyIndex--;
		}
		
		this.update_history_panel();
	}

	get_canvas_state() {
		const elements = [];
		$(this.wrapper).find('.canvas-element').each(function() {
			const $el = $(this);
			elements.push({
				html: $el[0].outerHTML,
				data: $el.data()
			});
		});
		return { elements, timestamp: Date.now() };
	}

	update_history_panel() {
		const historyList = $(this.wrapper).find('#history-list');
		historyList.empty();
		
		this.history.forEach((state, index) => {
			const data = JSON.parse(state);
			const item = $(`
				<div class="history-item ${index === this.historyIndex ? 'active' : ''}" data-index="${index}">
					<div class="history-icon">📝</div>
					<div class="history-text">
						<div>State ${index + 1}</div>
						<small>${new Date(data.timestamp).toLocaleTimeString()}</small>
					</div>
				</div>
			`);
			
			item.on('click', () => {
				this.historyIndex = index;
				this.restore_state(data);
				this.update_history_panel();
			});
			
			historyList.append(item);
		});
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
					frappe.show_alert({message: '✅ Template saved successfully', indicator: 'green'});
				} else {
					frappe.msgprint('❌ Error: ' + (r.message?.error || 'Unknown error'));
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
				type: $el.data('type'),
				field: $el.data('field'),
				x: position.left,
				y: position.top,
				width: $el.width(),
				height: $el.height(),
				config: $el.data('config'),
				zIndex: $el.css('z-index')
			});
		});

		return {
			name: $(this.wrapper).find('#template-name').val(),
			template_type: $(this.wrapper).find('#template-type').val(),
			label_width: $(this.wrapper).find('#label-width').val(),
			label_height: $(this.wrapper).find('#label-height').val(),
			background_color: $(this.wrapper).find('#bg-color').val(),
			border_style: $(this.wrapper).find('#border-style').val(),
			elements: elements
		};
	}

	show() {
		this.save_state();
	}
}