import xml.etree.ElementTree as ET
from services.payment_services import mock_xml_success_string

xml_string = mock_xml_success_string(0.500)
root = ET.fromstring(xml_string.encode('utf-8'))
namespaces = {
    's': 'http://schemas.xmlsoap.org/soap/envelope/',
    'a': 'http://schemas.datacontract.org/2004/07/',
    'ns': 'http://tempuri.org/'
}

sale_result = root.find('.//ns:SaleResult', namespaces)
print(sale_result)

if sale_result is not None:
    node = sale_result.find('a:PosAmount', namespaces)
    print("PosAmount:", node.text if node is not None else None)
else:
    print("SaleResult not found")
