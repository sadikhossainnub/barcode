frappe.pages['barcode-designer'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Barcode Designer',
		single_column: true
	});

	frappe.require([
		'https://unpkg.com/vue@3/dist/vue.global.js'
	], function() {
		new VueBarcodeDesigner(wrapper);
	});
}

class VueBarcodeDesigner {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.make();
	}

	make() {
		$(this.wrapper).find('.layout-main-section').html(`
			<div id="barcode-designer-app"></div>
		`);

		const template = `
			<div class="designer-container">
				<div class="sidebar">
					<div class="section">
						<h4>Template Settings</h4>
						<div class="form-group">
							<label>Name</label>
							<input v-model="template.name" class="form-control" placeholder="Template name">
						</div>
						<div class="row">
							<div class="col-6">
								<label>Width (mm)</label>
								<input v-model.number="template.width" type="number" class="form-control">
							</div>
							<div class="col-6">
								<label>Height (mm)</label>
								<input v-model.number="template.height" type="number" class="form-control">
							</div>
						</div>
					</div>

					<div class="section">
						<h4>Live Preview</h4>
						<div class="form-group">
							<label class="switch-label">
								<input type="checkbox" v-model="previewMode" @change="togglePreviewMode">
								<span>Show Real Data</span>
							</label>
						</div>
						<div v-if="previewMode" class="form-group">
							<label>Select Record</label>
							<select v-model="selectedRecord" @change="fetchLiveData" class="form-control">
								<option value="">Choose...</option>
								<option v-for="option in recordOptions" :key="option.value" :value="option.value">
									{{ option.label }}
								</option>
							</select>
						</div>
					</div>

					<div class="section">
						<h4>Data Fields</h4>
						<div class="element-buttons">
							<button @click="addElement('item_code')" class="btn btn-sm btn-primary">📦 Item Code</button>
							<button @click="addElement('item_name')" class="btn btn-sm btn-primary">🏷️ Item Name</button>
							<button @click="addElement('batch_no')" class="btn btn-sm btn-primary">🔢 Batch No</button>
							<button @click="addElement('barcode')" class="btn btn-sm btn-primary">📱 Item Barcode</button>
							<button @click="addElement('batch_barcode')" class="btn btn-sm btn-success">📱 Batch Barcode</button>
							<button @click="addElement('serial_barcode')" class="btn btn-sm btn-info">📱 Serial Barcode</button>
						</div>
					</div>

					<div class="section">
						<h4>Design Elements</h4>
						<div class="element-buttons">
							<button @click="addCustomText()" class="btn btn-sm btn-success">📝 Custom Text</button>
							<button @click="addLogo()" class="btn btn-sm btn-info">🖼️ Logo</button>
							<button @click="addImage()" class="btn btn-sm btn-warning">📷 Image</button>
							<button @click="addLine()" class="btn btn-sm btn-secondary">➖ Line</button>
							<button @click="addBox()" class="btn btn-sm btn-secondary">⬜ Box</button>
							<button @click="addQRCode()" class="btn btn-sm btn-dark">📱 QR Code</button>
						</div>
					</div>

					<div class="section">
						<h4>Actions</h4>
						<button @click="saveTemplate()" class="btn btn-success btn-block">💾 Save</button>
						<button @click="previewPDF()" class="btn btn-info btn-block">📄 PDF Preview</button>
						<button @click="printDirect()" class="btn btn-warning btn-block">🖨️ Print Direct</button>
						<button @click="clearCanvas()" class="btn btn-danger btn-block">🗑️ Clear</button>
					</div>

					<div class="section">
						<h4>Print Settings</h4>
						<div class="form-group">
							<label>Copies</label>
							<input v-model.number="printSettings.copies" type="number" class="form-control" min="1" max="100" value="1">
						</div>
						<div class="form-group">
							<label>Print Mode</label>
							<select v-model="printSettings.mode" class="form-control">
								<option value="pdf">PDF Output</option>
								<option value="thermal">Thermal Printer</option>
								<option value="laser">Laser Printer</option>
							</select>
						</div>
						<div v-if="printSettings.mode === 'thermal'" class="form-group">
							<label>Printer IP</label>
							<input v-model="printSettings.printerIP" class="form-control" placeholder="192.168.1.100">
						</div>
					</div>
				</div>

				<div class="canvas-area">
					<div class="toolbar">
						<button @click="zoomIn()" class="btn btn-sm">🔍+</button>
						<button @click="zoomOut()" class="btn btn-sm">🔍-</button>
						<button @click="resetZoom()" class="btn btn-sm">100%</button>
						<span class="zoom-display">{{ Math.round(zoom * 100) }}%</span>
						<button @click="undo()" :disabled="!canUndo" class="btn btn-sm">↶</button>
						<button @click="redo()" :disabled="!canRedo" class="btn btn-sm">↷</button>
					</div>

					<div class="canvas-container" @click="deselectAll">
						<div 
							class="canvas" 
							:style="canvasStyle"
						>
							<div 
								v-for="element in elements" 
								:key="element.id"
								class="canvas-element"
								:class="{ selected: element.selected, [element.type]: true }"
								:style="elementStyle(element)"
								@click.stop="selectElement(element)"
								@mousedown="startDrag(element, $event)"
							>
								<div class="element-content" v-html="renderElement(element)"></div>
								<div v-if="element.selected" class="element-controls">
									<button @click.stop="deleteElement(element)" class="delete-btn">×</button>
								</div>
								<div v-if="element.selected" class="resize-handles">
									<div class="handle se" @mousedown.stop="startResize(element, 'se', $event)"></div>
								</div>
							</div>

							<div v-if="elements.length === 0" class="drop-zone">
								<div class="drop-icon">🎨</div>
								<h3>Barcode Designer</h3>
								<p>Click buttons to add elements</p>
							</div>
						</div>
					</div>
				</div>

				<div class="properties-panel">
					<h4>Properties</h4>
					<div v-if="selectedElement">
						<div class="form-group">
							<label>Type: {{ selectedElement.type }}</label>
						</div>
						<div class="form-group">
							<label>X Position</label>
							<input v-model.number="selectedElement.x" type="number" class="form-control form-control-sm">
						</div>
						<div class="form-group">
							<label>Y Position</label>
							<input v-model.number="selectedElement.y" type="number" class="form-control form-control-sm">
						</div>
						<div class="form-group">
							<label>Width</label>
							<input v-model.number="selectedElement.width" type="number" class="form-control form-control-sm">
						</div>
						<div class="form-group">
							<label>Height</label>
							<input v-model.number="selectedElement.height" type="number" class="form-control form-control-sm">
						</div>
						<div v-if="selectedElement.type === 'text'" class="form-group">
							<label>Text</label>
							<input v-model="selectedElement.content" class="form-control form-control-sm">
						</div>
						<div class="form-group">
							<label>Font Size</label>
							<input v-model.number="selectedElement.fontSize" type="number" class="form-control form-control-sm">
						</div>
						<div class="form-group">
							<label>Color</label>
							<input v-model="selectedElement.color" type="color" class="form-control form-control-sm">
						</div>
					</div>
					<div v-else class="no-selection">
						<div class="icon">🎯</div>
						<p>Select an element to edit properties</p>
					</div>

					<div class="layers-section">
						<h4>Layers</h4>
						<div class="layer-list">
							<div 
								v-for="element in elements" 
								:key="element.id"
								class="layer-item"
								:class="{ active: element.selected }"
								@click="selectElement(element)"
							>
								<span>{{ element.type }} - {{ element.id.slice(-4) }}</span>
								<button @click.stop="deleteElement(element)" class="btn btn-xs">×</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		const { createApp } = Vue;
		
		this.app = createApp({
			template: template,
			data() {
				return {
					template: {
						name: '',
						width: 50,
						height: 30,
						type: 'General'
					},
					elements: [],
					selectedElement: null,
					zoom: 1,
					history: [],
					historyIndex: -1,
					dragData: null,
					resizeData: null,
					nextId: 1,
					liveData: {
						item_code: 'SAMPLE001',
						item_name: 'Sample Product',
						batch_no: 'BATCH001',
						serial_no: 'SN001',
						mfg_date: '01/01/2024',
						exp_date: '01/01/2025',
						quantity: '10',
						company: 'Sample Company'
					},
					previewMode: false,
					selectedRecord: null,
					recordOptions: [],
					printSettings: {
						copies: 1,
						mode: 'pdf',
						printerIP: ''
					}
				}
			},
			computed: {
				canvasStyle() {
					const width = this.template.width * 3.78;
					const height = this.template.height * 3.78;
					return {
						width: width + 'px',
						height: height + 'px',
						transform: `scale(${this.zoom})`,
						transformOrigin: 'center'
					};
				},
				canUndo() {
					return this.historyIndex > 0;
				},
				canRedo() {
					return this.historyIndex < this.history.length - 1;
				}
			},
			methods: {
				addElement(type) {
					const samples = {
						item_code: 'ITEM001',
						item_name: 'Sample Item Name',
						batch_no: 'BATCH001',
						serial_no: 'SN001',
						barcode: '||||| ||||',
						batch_barcode: '||||| ||||',
						serial_barcode: '||||| ||||'
					};

					const element = {
						id: 'el_' + this.nextId++,
						type: type,
						x: 10,
						y: 10,
						width: type.includes('barcode') ? 120 : 80,
						height: type.includes('barcode') ? 40 : 25,
						fontSize: 12,
						color: '#000000',
						content: samples[type] || type,
						selected: false
					};

					this.elements.push(element);
					this.saveState();
				},

				addCustomText() {
					const element = {
						id: 'el_' + this.nextId++,
						type: 'custom_text',
						x: 10,
						y: 40,
						width: 100,
						height: 20,
						fontSize: 14,
						fontWeight: 'normal',
						color: '#000000',
						content: 'Custom Text',
						selected: false
					};

					this.elements.push(element);
					this.saveState();
				},

				addLogo() {
					const element = {
						id: 'el_' + this.nextId++,
						type: 'logo',
						x: 10,
						y: 10,
						width: 50,
						height: 30,
						imageUrl: '',
						content: 'LOGO',
						selected: false
					};

					this.elements.push(element);
					this.saveState();
				},

				addImage() {
					const element = {
						id: 'el_' + this.nextId++,
						type: 'image',
						x: 60,
						y: 10,
						width: 40,
						height: 30,
						imageUrl: '',
						content: 'IMG',
						selected: false
					};

					this.elements.push(element);
					this.saveState();
				},

				addQRCode() {
					const element = {
						id: 'el_' + this.nextId++,
						type: 'qr',
						x: 10,
						y: 90,
						width: 40,
						height: 40,
						qrContent: 'Sample QR',
						content: 'QR',
						selected: false
					};

					this.elements.push(element);
					this.saveState();
				},

				addLine() {
					const element = {
						id: 'el_' + this.nextId++,
						type: 'line',
						x: 10,
						y: 70,
						width: 100,
						height: 2,
						fontSize: 12,
						color: '#000000',
						content: '',
						selected: false
					};

					this.elements.push(element);
					this.saveState();
				},

				addBox() {
					const element = {
						id: 'el_' + this.nextId++,
						type: 'box',
						x: 10,
						y: 80,
						width: 60,
						height: 40,
						fontSize: 12,
						color: '#000000',
						content: '',
						selected: false
					};

					this.elements.push(element);
					this.saveState();
				},

				selectElement(element) {
					this.deselectAll();
					element.selected = true;
					this.selectedElement = element;
				},

				deselectAll() {
					this.elements.forEach(el => el.selected = false);
					this.selectedElement = null;
				},

				deleteElement(element) {
					const index = this.elements.indexOf(element);
					if (index > -1) {
						this.elements.splice(index, 1);
						this.selectedElement = null;
						this.saveState();
					}
				},

				elementStyle(element) {
					return {
						position: 'absolute',
						left: element.x + 'px',
						top: element.y + 'px',
						width: element.width + 'px',
						height: element.height + 'px',
						fontSize: element.fontSize + 'px',
						fontWeight: element.fontWeight || 'normal',
						color: element.color
					};
				},

				renderElement(element) {
					let content = element.content;
					
					// Use live data if preview mode is on
					if (this.previewMode && this.liveData[element.type]) {
						content = this.liveData[element.type];
					}
					
					switch(element.type) {
						case 'line':
							return '<hr style="margin: 0; border-top: 2px solid currentColor; width: 100%;">';
						case 'box':
							return '<div style="width: 100%; height: 100%; border: 2px solid currentColor;"></div>';
						case 'barcode':
							if (this.previewMode && this.liveData.item_code !== 'Loading...') {
								return `<img src="/barcode?type=Code128&value=${this.liveData.item_code}&width=120&height=40" style="max-width: 100%; height: auto;" />`;
							}
							return '<div style="font-family: monospace; text-align: center; line-height: 1;">' + content + '</div>';
						case 'batch_barcode':
							if (this.previewMode && this.liveData.batch_no) {
								return `<img src="/barcode?type=Code128&value=${this.liveData.batch_no}&width=120&height=40" style="max-width: 100%; height: auto;" />`;
							}
							return '<div style="font-family: monospace; text-align: center; line-height: 1;">||||| ||||</div>';
						case 'serial_barcode':
							if (this.previewMode && this.liveData.serial_no) {
								return `<img src="/barcode?type=Code128&value=${this.liveData.serial_no}&width=120&height=40" style="max-width: 100%; height: auto;" />`;
							}
							return '<div style="font-family: monospace; text-align: center; line-height: 1;">||||| ||||</div>';
						case 'logo':
						case 'image':
							if (element.imageUrl) {
								return `<img src="${element.imageUrl}" style="width: 100%; height: 100%; object-fit: contain;" />`;
							}
							return `<div style="background: #f0f0f0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">${content}</div>`;
						case 'qr':
							if (element.qrContent) {
								return `<img src="/qrcode?data=${encodeURIComponent(element.qrContent)}&size=100" style="width: 100%; height: 100%; object-fit: contain;" />`;
							}
							return '<div style="background: #000; color: #fff; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 8px;">QR</div>';
						case 'custom_text':
							return content.replace(/\n/g, '<br>');
						default:
							return content;
					}
				},

				startDrag(element, event) {
					this.selectElement(element);
					this.dragData = {
						element: element,
						startX: event.clientX - element.x,
						startY: event.clientY - element.y
					};
					document.addEventListener('mousemove', this.onDragMove);
					document.addEventListener('mouseup', this.onDragEnd);
				},

				onDragMove(event) {
					if (this.dragData) {
						this.dragData.element.x = event.clientX - this.dragData.startX;
						this.dragData.element.y = event.clientY - this.dragData.startY;
					}
				},

				onDragEnd() {
					if (this.dragData) {
						this.saveState();
						this.dragData = null;
					}
					document.removeEventListener('mousemove', this.onDragMove);
					document.removeEventListener('mouseup', this.onDragEnd);
				},

				startResize(element, handle, event) {
					this.resizeData = {
						element: element,
						startX: event.clientX,
						startY: event.clientY,
						startWidth: element.width,
						startHeight: element.height
					};
					document.addEventListener('mousemove', this.onResizeMove);
					document.addEventListener('mouseup', this.onResizeEnd);
				},

				onResizeMove(event) {
					if (this.resizeData) {
						const dx = event.clientX - this.resizeData.startX;
						const dy = event.clientY - this.resizeData.startY;
						
						this.resizeData.element.width = Math.max(20, this.resizeData.startWidth + dx);
						this.resizeData.element.height = Math.max(10, this.resizeData.startHeight + dy);
					}
				},

				onResizeEnd() {
					if (this.resizeData) {
						this.saveState();
						this.resizeData = null;
					}
					document.removeEventListener('mousemove', this.onResizeMove);
					document.removeEventListener('mouseup', this.onResizeEnd);
				},

				zoomIn() {
					this.zoom = Math.min(3, this.zoom * 1.2);
				},

				zoomOut() {
					this.zoom = Math.max(0.3, this.zoom * 0.8);
				},

				resetZoom() {
					this.zoom = 1;
				},

				saveState() {
					const state = JSON.stringify({
						elements: JSON.parse(JSON.stringify(this.elements)),
						template: JSON.parse(JSON.stringify(this.template))
					});
					
					this.history = this.history.slice(0, this.historyIndex + 1);
					this.history.push(state);
					this.historyIndex++;
					
					if (this.history.length > 50) {
						this.history.shift();
						this.historyIndex--;
					}
				},

				undo() {
					if (this.canUndo) {
						this.historyIndex--;
						this.restoreState(this.history[this.historyIndex]);
					}
				},

				redo() {
					if (this.canRedo) {
						this.historyIndex++;
						this.restoreState(this.history[this.historyIndex]);
					}
				},

				restoreState(stateStr) {
					const state = JSON.parse(stateStr);
					this.elements = state.elements;
					this.template = state.template;
					this.selectedElement = null;
				},

				clearCanvas() {
					this.elements = [];
					this.selectedElement = null;
					this.saveState();
				},

				togglePreviewMode() {
					if (this.previewMode) {
						this.loadRecordOptions();
					}
				},

				loadRecordOptions() {
					frappe.call({
						method: 'frappe.client.get_list',
						args: {
							doctype: 'Item',
							fields: ['name', 'item_name'],
							limit: 20
						},
						callback: (r) => {
							if (r.message) {
								this.recordOptions = r.message.map(item => ({
									value: item.name,
									label: `${item.name} - ${item.item_name}`
								}));
							}
						}
					});
				},

				fetchLiveData() {
					if (!this.selectedRecord) return;
					
					frappe.call({
						method: 'frappe.client.get',
						args: {
							doctype: 'Item',
							name: this.selectedRecord
						},
						callback: (r) => {
							if (r.message) {
								const item = r.message;
								this.liveData = {
									item_code: item.name,
									item_name: item.item_name,
									batch_no: 'BATCH' + Math.floor(Math.random() * 1000),
									serial_no: 'SN' + Math.floor(Math.random() * 1000),
									mfg_date: new Date().toLocaleDateString(),
									exp_date: new Date(Date.now() + 365*24*60*60*1000).toLocaleDateString(),
									quantity: Math.floor(Math.random() * 100) + 1,
									company: frappe.defaults.get_user_default('Company') || 'Sample Company'
								};
							}
						}
					});
				},

				saveTemplate() {
					if (!this.template.name) {
						frappe.msgprint('Please enter template name');
						return;
					}

					const templateData = {
						name: this.template.name,
						template_type: this.template.type,
						label_width: this.template.width,
						label_height: this.template.height,
						elements: this.elements.map(el => ({
							type: el.type,
							field: el.type,
							x: el.x,
							y: el.y,
							width: el.width,
							height: el.height,
							fontSize: el.fontSize + 'px',
							color: el.color,
							content: el.content
						}))
					};

					frappe.call({
						method: 'barcode.barcode.api.save_visual_template',
						args: { template_data: templateData },
						callback: (r) => {
							if (r.message && r.message.success) {
								frappe.show_alert('✅ Template saved successfully');
							} else {
								frappe.msgprint('❌ Error saving template');
							}
						}
					});
				},

				uploadImage(element) {
					const input = document.createElement('input');
					input.type = 'file';
					input.accept = 'image/*';
					input.onchange = (e) => {
						const file = e.target.files[0];
						if (file) {
							const reader = new FileReader();
							reader.onload = (e) => {
								element.imageUrl = e.target.result;
								this.saveState();
							};
							reader.readAsDataURL(file);
						}
					};
					input.click();
				},

				previewPDF() {
					const templateData = this.generatePrintData();
					
					frappe.call({
						method: 'barcode.barcode.api.generate_pdf_preview',
						args: {
							template_data: templateData,
							copies: this.printSettings.copies
						},
						callback: (r) => {
							if (r.message && r.message.success) {
								// Open PDF in new window
								const pdfUrl = r.message.pdf_url;
								window.open(pdfUrl, '_blank');
							} else {
								frappe.msgprint('Error generating PDF: ' + (r.message?.error || 'Unknown error'));
							}
						}
					});
				},

				printDirect() {
					const templateData = this.generatePrintData();
					
					frappe.call({
						method: 'barcode.barcode.api.send_print_command',
						args: {
							template_data: templateData,
							print_settings: this.printSettings
						},
						callback: (r) => {
							if (r.message && r.message.success) {
								frappe.show_alert('Print job sent successfully');
							} else {
								frappe.msgprint('Print error: ' + (r.message?.error || 'Unknown error'));
							}
						}
					});
				},

				generatePrintData() {
					return {
						name: this.template.name || 'Untitled',
						width: this.template.width,
						height: this.template.height,
						elements: this.elements.map(el => ({
							type: el.type,
							x: el.x,
							y: el.y,
							width: el.width,
							height: el.height,
							content: el.content,
							fontSize: el.fontSize,
							fontWeight: el.fontWeight,
							color: el.color,
							imageUrl: el.imageUrl,
							qrContent: el.qrContent
						})),
						liveData: this.previewMode ? this.liveData : null
					};
				},

				previewLabel() {
					let html = `<div style="width: ${this.template.width}mm; height: ${this.template.height}mm; border: 1px solid #000; position: relative; background: white; font-family: Arial;">`;
					
					this.elements.forEach(el => {
						const content = this.renderElement(el);
						html += `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; font-size: ${el.fontSize}px; font-weight: ${el.fontWeight || 'normal'}; color: ${el.color};">${content}</div>`;
					});
					
					html += '</div>';

					const preview = window.open('', '_blank');
					preview.document.write(`
						<html>
						<head><title>Label Preview</title></head>
						<body style="padding: 20px; background: #f5f5f5;">${html}</body>
						</html>
					`);
				}
			},

			mounted() {
				this.saveState();
			}
		});

		this.app.mount('#barcode-designer-app');
	}
}