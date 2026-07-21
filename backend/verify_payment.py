from services.payment_services import process_soap_payment
import json
import os

os.environ['FLASK_ENV'] = 'development'
result = process_soap_payment(0.500)
print(json.dumps(result, indent=2))
