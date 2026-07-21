import requests
import xml.etree.ElementTree as ET
import os
import uuid
import datetime
import logging
logger = logging.getLogger(__name__)
from debug_logger import log_info

def generate_payment_xml(amount: float) -> str:
    """Generates the SOAP request payload"""
    return f"""<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:ns="http://schemas.datacontract.org/2004/07/">
    <soapenv:Header/>
    <soapenv:Body>
        <tem:Sale>
            <!--Optional:-->
            <tem:webReq>
                <!--Optional:-->
                <ns:Config>
                <!--Optional:-->
                <ns:EcrCurrencyCode>512</ns:EcrCurrencyCode>
                <!--Optional:-->
                <ns:EcrTillerFullName>test</ns:EcrTillerFullName>
                <!--Optional:-->
                <ns:EcrTillerUserName>test</ns:EcrTillerUserName>
                <!--Optional:-->
                <ns:IntegratorName>afs</ns:IntegratorName>
                <!--Optional:-->
                <ns:MerchantSecureKey>6D7A49BE09894E8399CB8D645B17151D</ns:MerchantSecureKey>
                <!--Optional:-->
                <ns:Mid>000000000039768</ns:Mid>
                <!--Optional:-->
                <ns:Tenant>apex</ns:Tenant>
                <!--Optional:-->
                <ns:Tid>00578252</ns:Tid>
                </ns:Config>
                <!--Optional:-->
                <ns:EcrAmount>{amount}</ns:EcrAmount>
                <!--Optional:-->
                <ns:Printer>
                <!--Optional:-->
                <ns:EnablePrintPosReceipt>1</ns:EnablePrintPosReceipt>
                <!--Optional:-->
                <ns:EnablePrintReceiptNote>1</ns:EnablePrintReceiptNote>
                <!--Optional:-->
                <ns:InvoiceNumber>INV_{uuid.uuid4().hex[:6]}</ns:InvoiceNumber>
                <!--Optional:-->
                <ns:PrinterWidth>40</ns:PrinterWidth>
                <!--Optional:-->
                <ns:ReceiptNote>Hello</ns:ReceiptNote>
                <!--Optional:-->
                <ns:ReferenceNumber>REF_{uuid.uuid4().hex[:6]}</ns:ReferenceNumber>
                </ns:Printer>
            </tem:webReq>
        </tem:Sale>
    </soapenv:Body>
    </soapenv:Envelope>"""

def mock_xml_success_string(pos_amount=0.010):
    """Returns a mock successful SOAP response."""
    bank_ref = "123456"
    return f"""<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
    <s:Header>
        <ActivityId CorrelationId="{uuid.uuid4()}" xmlns="http://schemas.microsoft.com/2004/09/ServiceModel/Diagnostics">
            00000000-0000-0000-0000-000000000000
        </ActivityId>
    </s:Header>
    <s:Body>
        <SaleResponse xmlns="http://tempuri.org/">
            <SaleResult xmlns:a="http://schemas.datacontract.org/2004/07/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
                <a:PosAmount>{pos_amount}</a:PosAmount>
                <a:PosAuthCode>221669</a:PosAuthCode>
                <a:PosBatchNumber>000001</a:PosBatchNumber>
                <a:PosCVMId>9</a:PosCVMId>
                <a:PosCardEntryModeId>5</a:PosCardEntryModeId>
                <a:PosCurrencyCode>512</a:PosCurrencyCode>
                <a:PosDate>{datetime.datetime.now().strftime('%Y%m%d')}</a:PosDate>
                <a:PosInvoiceNumber>000010</a:PosInvoiceNumber>
                <a:PosIssuerName>OMANNET</a:PosIssuerName>
                <a:PosPan>464426******8390</a:PosPan>
                <a:PosRRN>500300690807</a:PosRRN>
                <a:PosReceipt>
                    MOCK RECEIPT TEXT
                </a:PosReceipt>
                <a:PosRespCode>00</a:PosRespCode>
                <a:PosRespStatus>1</a:PosRespStatus>
                <a:PosRespText>APPROVAL {bank_ref}</a:PosRespText>
                <a:PosStan>000033</a:PosStan>
                <a:PosTime>{datetime.datetime.now().strftime('%H%M%S')}</a:PosTime>
                <a:PosTxnName>Sale</a:PosTxnName>
                <a:WebResponseStatus>Success</a:WebResponseStatus>
                <a:WebResponseErrorDesc/>
            </SaleResult>
        </SaleResponse>
    </s:Body>
</s:Envelope>"""

def mock_xml_error_string():
    """Returns a mock error SOAP response."""
    return f"""<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
    <s:Header>
        <ActivityId CorrelationId="{uuid.uuid4()}" xmlns="http://schemas.microsoft.com/2004/09/ServiceModel/Diagnostics">
            00000000-0000-0000-0000-000000000000
        </ActivityId>
    </s:Header>
    <s:Body>
        <SaleResponse xmlns="http://tempuri.org/">
            <SaleResult xmlns:a="http://schemas.datacontract.org/2004/07/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
                <a:PosAmount>0.000000</a:PosAmount>
                <a:PosRespCode>uc</a:PosRespCode>
                <a:PosRespStatus>0</a:PosRespStatus>
                <a:PosRespText>Card Read Error</a:PosRespText>
                <a:WebResponseStatus>Failed</a:WebResponseStatus>
                <a:WebResponseErrorDesc>Transaction Timeout</a:WebResponseErrorDesc>
            </SaleResult>
        </SaleResponse>
    </s:Body>
</s:Envelope>"""

def parse_soap_response(xml_string: str) -> dict:
    """Parses the SOAP XML response and extracts payment fields"""
    try:
        root = ET.fromstring(xml_string.encode('utf-8'))
        
        # namespaces
        namespaces = {
            's': 'http://schemas.xmlsoap.org/soap/envelope/',
            'a': 'http://schemas.datacontract.org/2004/07/',
            'ns': 'http://tempuri.org/'
        }

        # Query <SaleResult>
        sale_result = root.find('.//ns:SaleResult', namespaces)
        if sale_result is None:
            return {
                'success': False,
                'message': 'Payment failed. Invalid response structure.'
            }

        def get_val(tag_name):
            node = sale_result.find(f'a:{tag_name}', namespaces)
            return node.text.strip() if node is not None and node.text else None

        pos_resp_code = get_val('PosRespCode')
        pos_auth_code = get_val('PosAuthCode')
        web_response_status = get_val('WebResponseStatus')
        web_response_error_desc = get_val('WebResponseErrorDesc')
        pos_amount = get_val('PosAmount')
        pos_receipt = get_val('PosReceipt')
        pos_time = get_val('PosTime')
        pos_pan = get_val('PosPan')
        pos_invoice = get_val('PosInvoiceNumber')

        resp_status = pos_resp_code in ['00', '000']
        message = web_response_status if resp_status else (pos_auth_code or web_response_error_desc)

        return {
            'success': resp_status,
            'message': message,
            'PosRespCode': pos_resp_code,
            'PosAuthCode': pos_auth_code,
            'WebResponseStatus': web_response_status,
            'WebResponseErrorDesc': web_response_error_desc,
            'PosAmount': pos_amount,
            'PosPan': pos_pan,
            'PosInvoiceNumber': pos_invoice,
            'PosReceipt': pos_receipt,
            'PosTime': pos_time
        }
    except Exception as e:
        logger.error(f"Error parsing SOAP XML: {e}")
        return {
            'success': False,
            'message': 'Error parsing payment response.'
        }

def process_soap_payment(amount: float) -> dict:
    """
    Sends the SOAP request to the payment gateway.
    Uses a mock if not in production.
    """
    is_production = os.getenv('FLASK_ENV', 'development') == 'production'

    if not is_production:
        log_info(f"Using mock SOAP response for amount: {amount}")
        mock_xml = mock_xml_success_string(amount)
        return parse_soap_response(mock_xml)

    url = 'https://ereceiptom.afs.com.bh/Ecr.Om.Abo/EcrComInterface.svc'
    headers = {
        'SOAPAction': '"http://tempuri.org/IEcrComInterface/Sale"',
        'Content-Type': 'text/xml'
    }
    payload = generate_payment_xml(amount)

    try:
        response = requests.post(url, data=payload, headers=headers, timeout=60)
        response.raise_for_status()
        return parse_soap_response(response.text)
    except Exception as e:
        logger.error(f"SOAP Payment Request Failed: {e}")
        error_xml = mock_xml_error_string()
        return parse_soap_response(error_xml)
