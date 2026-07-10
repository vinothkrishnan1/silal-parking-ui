import json
from barcode import Code128
from barcode.writer import ImageWriter
import base64
from io import BytesIO

# Sample data
data = {
    "vehicle_number": "MH12AB1234",
    "date": "2025-05-06",
    "entry-time": "14:30:00"
}

# Create barcode string
barcode_data = f"{data['vehicle_number']}"

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
for key, value in data.items():
    label = key.replace("_", " ").title()
    html += f"<p><strong>{label}:</strong> {value}</p>\n"

# Close HTML
html += """
            </div>
            <hr>
        </div>
        <div class="footer">
            Thank you for using our parking service.<br>
            Please keep this slip safe.
        </div>
        <button onclick="window.print()">Print Slip</button>
    </div>
</body>
</html>
"""

# Save the file
with open("parking_slip.html", "w", encoding="utf-8") as f:
    f.write(html)

print("🧾 Final parking slip created: 'parking_slip.html'. Open in a browser to preview or print.")
