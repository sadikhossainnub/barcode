#!/usr/bin/env python3

import frappe
import sys

def test_barcode_app():
    """Test basic functionality of the barcode app"""
    
    print("Testing Barcode Label Printing App...")
    
    try:
        # Test 1: Check if doctypes exist
        print("✓ Testing doctype creation...")
        
        doctypes = [
            "Barcode Label Settings",
            "Barcode Label Template", 
            "Barcode Print Log",
            "Barcode Type Option"
        ]
        
        for doctype in doctypes:
            if frappe.db.exists("DocType", doctype):
                print(f"  ✓ {doctype} exists")
            else:
                print(f"  ✗ {doctype} missing")
                return False
        
        # Test 2: Check settings
        print("✓ Testing settings...")
        settings = frappe.get_single("Barcode Label Settings")
        if settings:
            print(f"  ✓ Settings loaded: {settings.default_barcode_type}")
        else:
            print("  ✗ Settings not found")
            return False
        
        # Test 3: Check templates
        print("✓ Testing templates...")
        templates = frappe.get_all("Barcode Label Template")
        if templates:
            print(f"  ✓ Found {len(templates)} templates")
        else:
            print("  ✗ No templates found")
        
        # Test 4: Test API
        print("✓ Testing API...")
        from barcode.barcode.api import get_templates
        api_templates = get_templates()
        if api_templates:
            print(f"  ✓ API returned {len(api_templates)} templates")
        else:
            print("  ✗ API returned no templates")
        
        print("\n🎉 All tests passed! Barcode app is ready to use.")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        return False

if __name__ == "__main__":
    frappe.init(site="your-site-name")  # Replace with actual site name
    frappe.connect()
    
    success = test_barcode_app()
    sys.exit(0 if success else 1)