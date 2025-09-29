import frappe

def get_context(context):
    """Get context for outer box test page"""
    context.title = "Outer Box Label Test"
    return context