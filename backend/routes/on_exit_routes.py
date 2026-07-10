from flask import Flask
from services.on_exit_services import update_payment_status, exit_ping_on_exit

def register_on_exit_routes(app: Flask):
    """
    Registers the routes related to the on_exit functionality.
    """
    app.add_url_rule('/payment_status', view_func=update_payment_status, methods=['POST'])
    app.add_url_rule('/exit_ping_on_exit', view_func=exit_ping_on_exit, methods=['GET', 'POST'])
