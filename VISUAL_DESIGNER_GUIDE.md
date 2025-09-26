# Visual Barcode Designer Guide

## 🎨 Visual Label Designer

The Barcode app now includes a powerful visual designer that allows you to create custom label templates using a drag-and-drop interface.

## 🚀 Getting Started

### 1. Access the Designer
- Navigate to **Barcode** workspace
- Click on **Label Designer**
- Or go directly to `/app/barcode-designer`

### 2. Designer Interface

The designer consists of three main panels:

#### Left Panel - Template Settings & Fields
- **Template Settings**: Configure name, type, and dimensions
- **Available Fields**: Drag and drop fields onto the canvas
- **Barcode Settings**: Configure barcode type and size

#### Center Panel - Design Canvas
- **Visual Canvas**: Design area representing your label
- **Zoom Controls**: Zoom in/out for precise positioning
- **Grid**: Helps with alignment

#### Right Panel - Element Properties
- **Properties**: Modify selected element properties
- **Font Settings**: Size, weight, alignment
- **Positioning**: Fine-tune element placement

## 🎯 How to Use

### Creating a New Template

1. **Set Template Info**
   - Enter template name
   - Select template type (Item/Batch/Serial No/General)
   - Set label dimensions in mm

2. **Add Fields**
   - Click "Add" next to any field in the left panel
   - Fields appear on the canvas as draggable elements
   - Drag elements to desired positions

3. **Customize Elements**
   - Click any element to select it
   - Use the right panel to modify properties:
     - Font size
     - Font weight (Normal/Bold)
     - Text alignment (Left/Center/Right)
   - Drag corners to resize elements

4. **Configure Barcode**
   - Add the "Barcode" field to your design
   - Set barcode type (Code128, QR Code, etc.)
   - Adjust barcode dimensions

5. **Save Template**
   - Click "Save Template" in the toolbar
   - Template is saved and can be used for printing

### Preview Your Design

- Click "Preview" to see how your label will look
- Opens in a new window with sample data
- Test print to verify layout

## 🛠️ Features

### Drag & Drop Interface
- Intuitive field placement
- Visual positioning
- Real-time preview

### Element Controls
- **Move**: Drag elements around the canvas
- **Resize**: Drag corners to resize
- **Delete**: Click the × button on elements
- **Properties**: Click to select and edit properties

### Canvas Tools
- **Zoom**: In/Out/Reset for detailed work
- **Grid**: Visual alignment guide
- **Dimensions**: Real-time size display

### Field Types Available
- Item Code
- Item Name  
- Batch Number
- Serial Number
- Manufacturing Date
- Expiry Date
- Quantity
- Company Name
- Barcode (1D/2D)

## 📋 Template Types

### Item Labels
- Focus on item identification
- Include item code, name, barcode
- Compact design for inventory

### Batch Labels  
- Include batch information
- Manufacturing and expiry dates
- Traceability data

### Serial Number Labels
- Individual item tracking
- Serial number prominence
- Asset management focus

### General Labels
- Flexible for any use case
- Custom field combinations
- Multi-purpose design

## 💡 Tips & Best Practices

### Design Tips
1. **Keep it Simple**: Don't overcrowd the label
2. **Hierarchy**: Make important info prominent
3. **Readability**: Ensure text is large enough
4. **Test Print**: Always test on actual label stock

### Layout Guidelines
1. **Margins**: Leave space around edges
2. **Alignment**: Use the grid for consistency  
3. **Barcode Placement**: Ensure scannable area
4. **Font Sizes**: Minimum 8pt for readability

### Performance
1. **Element Count**: Keep under 10 elements per label
2. **Image Size**: Optimize barcode dimensions
3. **Preview Often**: Check layout frequently

## 🔧 Technical Details

### Generated Output
The designer automatically generates:
- **HTML Template**: Jinja2 template with positioning
- **CSS Styles**: Absolute positioning and styling
- **Field Mappings**: Automatic field detection

### Integration
- Templates work with existing print functions
- Compatible with all barcode types
- Supports bulk printing

### Browser Support
- Modern browsers with HTML5 support
- Chrome, Firefox, Safari, Edge
- Mobile responsive design

## 🚨 Troubleshooting

### Common Issues

**Elements not draggable**
- Ensure jQuery UI is loaded
- Check browser console for errors
- Refresh the page

**Save not working**
- Check template name is entered
- Verify permissions
- Check network connectivity

**Preview not showing**
- Ensure elements are added to canvas
- Check barcode configuration
- Verify template data

### Getting Help
- Check browser console for errors
- Review template configuration
- Test with simple layouts first

## 🎉 Next Steps

After creating your template:
1. Test with real data
2. Print sample labels
3. Adjust as needed
4. Set as default if desired
5. Train users on the new template

The visual designer makes label creation intuitive and powerful, allowing you to create professional barcode labels without coding!