
import json
from barcode import Code128
from barcode.writer import ImageWriter
import base64
from io import BytesIO


def generate_parking_slip_html(data):
    """
    Generates the HTML for a parking slip, including barcode, from the provided data.

    Args:
        data (dict): A dictionary containing the parking data, including:
            - vehicle_number (str): The vehicle's license plate number.
            - date (str): The date of entry.
            - entry-time (str): The time of entry.
            - printable_slip (str, optional): base64 encoded image of the printable area.
    Returns:
        str: The generated HTML for the parking slip.
    """
    vehicle_number = data.get("vehicle_number", "")
    entry_date = data.get("date", "")
    entry_time = data.get("entry-time", "")



    # Create barcode string
    barcode_data = f"{vehicle_number}"

    # Generate barcode image in memory
    barcode_img_io = BytesIO()
    barcode = Code128(barcode_data, writer=ImageWriter())
    barcode.write(barcode_img_io)
    barcode_img_io.seek(0)

    # Convert image to base64
    barcode_base64 = base64.b64encode(barcode_img_io.read()).decode('utf-8')
    barcode_img_tag = f'<img src="data:image/png;base64,{barcode_base64}" alt="Barcode" width="320" height="100">'

    # HTML content
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Parking Slip</title>
    <style>
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: monospace;
            background: white;
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        .slip {{
            width: 100%;
            max-width: 400px;
            height: 100%;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
        }}
        h2 {{
            font-size: 24px;
            margin-bottom: 20px;
        }}
        .barcode {{
            margin: 20px auto;
        }}
        .info {{
            font-size: 18px;
            text-align: left;
            margin: 20px 0;
            line-height: 2.2;
        }}
        .footer {{
            font-size: 16px;
            margin-top: 20px;
        }}
        hr {{
            border: none;
            border-top: 2px dashed #000;
            margin: 20px 0;
        }}
        button {{
            font-size: 18px;
            padding: 12px 24px;
            margin-top: 20px;
            background: black;
            color: white;
            border: none;
            cursor: pointer;
        }}
        @media print {{
            button {{
                display: none;
            }}
            html, body {{
                height: auto;
                margin: 0;
                padding: 0;
            }}
        }}
    </style>
</head>
<body>
    <div class="slip">
        <div>
            <h2>LIFELINE HOSPITAL</h2>
            <h3>Falaj Al Qabail, Sohar, Sultanate of Oman.
Tel: 26651111, Fax: 26651122</h3>
            <h3>Parking Slip</h3>
            <hr>
            <div class="barcode">{barcode_img_tag}</div>
            <hr>
            <div class="info">
"""

    # Append info fields
    html += f"<p><strong>Vehicle Number:</strong> {vehicle_number}</p>\n"
    html += f"<p><strong>Date:</strong> {entry_date}</p>\n"
    html += f"<p><strong>Entry Time:</strong> {entry_time}</p>\n"

    # Close HTML
    html += """
            </div>
            <hr>
        </div>
        <div class="footer">
            Thank you for using our parking service.<br>
            Please keep this slip safe.
        </div>
    </div>
</body>
</html>
"""
    html = html.replace('\n','')
    return html


