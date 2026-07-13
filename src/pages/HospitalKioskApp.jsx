import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Car,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  Edit,
  Home,
  Keyboard,
  Printer,
  Wallet,
  X,
} from "lucide-react";
import {
  formatAppDate,
  formatAppTime,
  useAppTimeZone,
} from "../utils/dateTime";
import { apiUrl } from "../utils/api";
import {
  APP_KIOSK_VIDEOS_EVENT,
  getStoredKioskVideos,
} from "../utils/appStorage";
import TizenVideoPlayer from "../components/TizenVideoPlayer";

const KIOSK_API_URL = apiUrl("/receive_data");
const PAYMENT_API_URL = apiUrl("/payment_status");
const DEFAULT_KIOSK_BACKGROUND_VIDEO =
  "https://storage.googleapis.com/webfundamentals-assets/videos/chrome.mp4";

const normalizeCategory = (value) => {
  if (!value) return "Visitor";
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "staff") return "Staff";
  if (normalized === "tenant") return "Tenant";
  return "Visitor";
};

const formatDuration = (minutes) => {
  if (
    minutes === null ||
    minutes === undefined ||
    Number.isNaN(Number(minutes))
  ) {
    return "--";
  }

  const numericMinutes = Number(minutes);
  const totalMinutes =
    numericMinutes > 0 ? Math.max(1, Math.round(numericMinutes)) : 0;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (!hours) return `${remainingMinutes} min`;
  if (!remainingMinutes) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  if (typeof value === "number") return value !== 0;
  return Boolean(value);
};

const extractKioskPayload = (source) => {
  let current = source;

  for (let depth = 0; depth < 5; depth += 1) {
    if (!current) return null;

    if (typeof current === "string") {
      try {
        current = JSON.parse(current);
      } catch {
        return null;
      }
    }

    if (typeof current !== "object") return null;

    if (current.license_plate || current.licensePlate) {
      return current;
    }

    if (current.data) {
      current = current.data;
      continue;
    }

    if (current.payload) {
      current = current.payload;
      continue;
    }

    if (current.vehicle) {
      current = current.vehicle;
      continue;
    }

    return null;
  }

  return null;
};

const normalizeKioskPayload = (responseJson) => {
  const payload = extractKioskPayload(responseJson);
  if (!payload) return null;

  const plateNumber = payload.license_plate || payload.licensePlate || null;
  if (!plateNumber) return null;

  const flowType =
    payload.flow_type ||
    payload.flowType ||
    (payload.exit_time ||
      payload.exitTime ||
      payload.payable_amount !== undefined ||
      payload.payableAmount !== undefined ||
      payload.requires_payment !== undefined ||
      payload.requiresPayment !== undefined
      ? "exit"
      : "entry");

  const vehicleCategory = normalizeCategory(
    payload.vehicle_category ||
    payload.vehicleCategory ||
    payload.tenant_type ||
    payload.tenantType
  );

  return {
    flowType,
    plateNumber,
    vehicleCategory,
    entryTime: payload.entry_time || payload.entryTime || null,
    exitTime: payload.exit_time || payload.exitTime || null,
    durationMinutes:
      payload.duration !== undefined && payload.duration !== null
        ? Number(payload.duration)
        : payload.durationMinutes !== undefined && payload.durationMinutes !== null
          ? Number(payload.durationMinutes)
          : null,
    payableAmount:
      payload.payable_amount !== undefined && payload.payable_amount !== null
        ? Number(payload.payable_amount)
        : payload.payableAmount !== undefined && payload.payableAmount !== null
          ? Number(payload.payableAmount)
          : 0,
    requiresPayment: toBoolean(
      payload.requires_payment !== undefined
        ? payload.requires_payment
        : payload.requiresPayment
    ),
    requiresPrint:
      payload.requires_print !== undefined
        ? toBoolean(payload.requires_print)
        : payload.requiresPrint !== undefined
          ? toBoolean(payload.requiresPrint)
          : flowType === "entry" && vehicleCategory === "Visitor",
    barcodeImage: payload.barcode_image || payload.barcodeImage || null,
    printableSlip: payload.printable_slip || payload.printableSlip || null,
    message:
      payload.message ||
      (responseJson && typeof responseJson === "object" ? responseJson.message || "" : ""),
    accessDenied: toBoolean(
      payload.access_denied !== undefined
        ? payload.access_denied
        : payload.accessDenied
    ),
  };
};

const kioskAccentStyles = {
  blue: {
    glow: "bg-blue-200/50",
    iconWrap: "bg-blue-50 text-primary-blue border-blue-100",
    pill: "bg-blue-50 text-primary-blue border-blue-100",
  },
  gold: {
    glow: "bg-premium-gold/20",
    iconWrap: "bg-premium-gold/10 text-premium-gold border-premium-gold/20",
    pill: "bg-premium-gold/10 text-[#8b6b10] border-premium-gold/20",
  },
  green: {
    glow: "bg-emerald-200/50",
    iconWrap: "bg-emerald-50 text-emerald-600 border-emerald-100",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  amber: {
    glow: "bg-amber-200/60",
    iconWrap: "bg-amber-50 text-amber-600 border-amber-100",
    pill: "bg-amber-50 text-amber-700 border-amber-100",
  },
  red: {
    glow: "bg-red-200/50",
    iconWrap: "bg-red-50 text-red-600 border-red-100",
    pill: "bg-red-50 text-red-700 border-red-100",
  },
};

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl bg-premium-black px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50";
const mutedButtonClass =
  "inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-100";

const KioskPanel = ({
  title,
  subtitle,
  icon: Icon,
  accent = "blue",
  width = "max-w-md",
  pillText = "Pro Parking Kiosk",
  children,
}) => {
  const accentStyle = kioskAccentStyles[accent] || kioskAccentStyles.blue;

  return (
    <div className={`relative w-full ${width}`}>
      <div
        className={`absolute -right-14 -top-14 h-36 w-36 rounded-full ${accentStyle.glow} blur-3xl`}
      />
      <div className="premium-card relative overflow-hidden rounded-[2rem] border-white/80 bg-white/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />
        <div className="absolute -left-20 bottom-0 h-32 w-32 rounded-full bg-slate-100/80 blur-3xl" />

        <div className="border-b border-gray-100 px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${accentStyle.iconWrap} shadow-sm`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
                  Premium Access Flow
                </p>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">
                  {title}
                </h2>
                {subtitle ? (
                  <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-gray-500">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${accentStyle.pill}`}
            >
              {pillText}
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-7">{children}</div>
      </div>
    </div>
  );
};

const VirtualKeyboard = ({ onKeyPress }) => {
  const rows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];

  return (
    <div className="space-y-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onKeyPress(key)}
              className="flex h-10 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-premium-gold/30 hover:bg-premium-gold/5"
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="flex justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onKeyPress("backspace")}
          className="flex h-10 w-20 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 shadow-sm transition hover:border-red-200 hover:bg-red-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onKeyPress(" ")}
          className="flex h-10 w-36 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 shadow-sm transition hover:border-premium-gold/30 hover:bg-premium-gold/5"
        >
          Space
        </button>
      </div>
    </div>
  );
};

const PlateEditorScreen = ({
  plateNumber,
  flowType,
  vehicleCategory,
  onSubmit,
  onCancel,
}) => {
  const [value, setValue] = useState(plateNumber || "");
  const [showKeyboard, setShowKeyboard] = useState(false);

  useEffect(() => {
    setValue(plateNumber || "");
  }, [plateNumber]);

  const subtitle =
    flowType === "exit"
      ? "Confirm the detected number before continuing to exit or payment."
      : `${vehicleCategory} vehicle detected. Confirm the number to continue.`;

  const handleKeyPress = (key) => {
    if (key === "backspace") {
      setValue((prev) => prev.slice(0, -1));
      return;
    }

    setValue((prev) => prev + key);
  };

  return (
    <KioskPanel
      title="Detected Vehicle Number"
      subtitle={subtitle}
      icon={Car}
      accent="blue"
      width="max-w-xl"
      pillText={flowType === "exit" ? "Exit Flow" : "Entry Flow"}
    >
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary-blue">
              <Car className="mr-2 h-3.5 w-3.5" />
              {vehicleCategory}
            </div>
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
              <Edit className="mr-2 h-3.5 w-3.5 text-premium-gold" />
              Editable
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value.toUpperCase())}
              placeholder="Enter Vehicle Number"
              className="w-full rounded-[1.25rem] border border-white bg-white px-5 py-4 text-center text-3xl font-black uppercase tracking-[0.22em] text-gray-900 shadow-sm focus:border-premium-gold/30 focus:outline-none focus:ring-2 focus:ring-premium-gold/20"
            />

            {value && (
              <button
                type="button"
                onClick={() => setValue("")}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500 transition hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowKeyboard((prev) => !prev)}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
        >
          <Keyboard className="mr-2 h-4 w-4 text-premium-gold" />
          <span>{showKeyboard ? "Hide Virtual Keyboard" : "Show Virtual Keyboard"}</span>
        </button>

        {showKeyboard && (
          <div className="rounded-[1.5rem] border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm">
            <VirtualKeyboard onKeyPress={handleKeyPress} />
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onCancel} className={`${mutedButtonClass} flex-1`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => value.trim() && onSubmit(value.trim().toUpperCase())}
            disabled={!value.trim()}
            className={`${primaryButtonClass} flex-1`}
          >
            Continue
          </button>
        </div>
      </div>
    </KioskPanel>
  );
};

const DetailCard = ({ label, value, icon: Icon }) => (
  <div className="rounded-[1.25rem] border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm">
    <div className="mb-2 flex items-center text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
      <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-xl bg-premium-gold/10 text-premium-gold">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span>{label}</span>
    </div>
    <div className="text-sm font-semibold text-gray-800">{value}</div>
  </div>
);

const EntryConfirmationScreen = ({ session, onBack, onConfirm, onCancel }) => (
  <KioskPanel
    title="Confirm Visitor Entry"
    subtitle="Review the ANPR result before generating the visitor pass."
    icon={Check}
    accent="gold"
    width="max-w-xl"
    pillText="Pass Generation"
  >
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-premium-gold/20 bg-gradient-to-br from-premium-gold/10 to-white p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center rounded-full border border-premium-gold/20 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6b10]">
            <Car className="mr-2 h-3.5 w-3.5" />
            Vehicle Number
          </div>
          <button onClick={onBack} className={secondaryButtonClass}>
            <Edit className="mr-2 h-4 w-4 text-premium-gold" />
            Edit
          </button>
        </div>

        <div className="rounded-[1.25rem] border border-white bg-white py-4 text-center text-3xl font-black uppercase tracking-[0.22em] text-gray-900 shadow-sm">
          {session.plateNumber}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailCard
          label="Entry Date"
          value={formatAppDate(session.entryTime)}
          icon={Calendar}
        />
        <DetailCard
          label="Entry Time"
          value={formatAppTime(session.entryTime)}
          icon={Clock}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={onCancel} className={`${mutedButtonClass} flex-1`}>
          Cancel
        </button>
        <button onClick={onConfirm} className={`${primaryButtonClass} flex-1`}>
          <Check className="mr-2 h-4 w-4 text-premium-gold" />
          Generate Pass
        </button>
      </div>
    </div>
  </KioskPanel>
);

const PaymentScreen = ({ session, onBack, onCancel, onPaid }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePayment = async (method) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(PAYMENT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          license_plate: session.plateNumber,
          payment_status: session.payableAmount > 0 ? "paid" : "waived",
          payment_mode: method,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || "Failed to process payment");
      }

      onPaid(method);
    } catch (error) {
      alert(error.message || "Failed to process payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KioskPanel
      title="Exit Payment"
      subtitle={session.message || "Complete payment to allow exit."}
      icon={Wallet}
      accent="amber"
      width="max-w-2xl"
      pillText="Exit Clearance"
    >
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
            Vehicle Number
          </div>
          <div className="text-3xl font-black uppercase tracking-[0.2em] text-gray-900">
            {session.plateNumber}
          </div>
          <div className="mt-2 text-sm font-medium text-gray-500">
            {session.vehicleCategory} vehicle
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailCard
            label="Entry Date"
            value={formatAppDate(session.entryTime)}
            icon={Calendar}
          />
          <DetailCard
            label="Entry Time"
            value={formatAppTime(session.entryTime)}
            icon={Clock}
          />
          <DetailCard
            label="Exit Date"
            value={formatAppDate(session.exitTime)}
            icon={Calendar}
          />
          <DetailCard
            label="Exit Time"
            value={formatAppTime(session.exitTime)}
            icon={Clock}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailCard
            label="Duration"
            value={formatDuration(session.durationMinutes)}
            icon={Clock}
          />
          <div className="rounded-[1.25rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              Amount Due
            </div>
            <div className="text-2xl font-black text-emerald-700">
              OMR {session.payableAmount.toFixed(3)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => handlePayment("cash")}
            disabled={isSubmitting}
            className={`${primaryButtonClass} bg-emerald-600 hover:bg-emerald-700`}
          >
            <Wallet className="mr-2 h-4 w-4" />
            <span>{isSubmitting ? "Processing..." : "Pay Cash"}</span>
          </button>
          <button
            onClick={() => handlePayment("card")}
            disabled={isSubmitting}
            className={`${primaryButtonClass} bg-primary-blue hover:bg-blue-700`}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span>{isSubmitting ? "Processing..." : "Pay Card"}</span>
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={onBack} className={`${secondaryButtonClass} flex-1`}>
            <Edit className="mr-2 h-4 w-4 text-premium-gold" />
            Edit Number
          </button>
          <button onClick={onCancel} className={`${mutedButtonClass} flex-1`}>
            Cancel
          </button>
        </div>
      </div>
    </KioskPanel>
  );
};

const PrintPassScreen = ({ session, onHome }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const entryDate = formatAppDate(session.entryTime);
  const entryTime = formatAppTime(session.entryTime);

  const generatePDF = () => {
    setIsDownloading(true);

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const center = pageWidth / 2;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("VISITOR VEHICLE PASS", center, 20, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(`Vehicle Number: ${session.plateNumber}`, 20, 40);
      pdf.text(`Entry Date: ${entryDate}`, 20, 52);
      pdf.text(`Entry Time: ${entryTime}`, 20, 64);
      pdf.text(`Category: ${session.vehicleCategory}`, 20, 76);

      if (session.barcodeImage) {
        pdf.addImage(
          `data:image/png;base64,${session.barcodeImage}`,
          "PNG",
          center - 25,
          90,
          50,
          30
        );
      }

      pdf.setFontSize(10);
      pdf.text("Pro Parking - Display this slip on the dashboard", center, 135, {
        align: "center",
      });

      pdf.save(`Parking_Pass_${session.plateNumber}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <KioskPanel
      title="Pass Ready"
      subtitle="The visitor pass is ready to download or display."
      icon={Printer}
      accent="green"
      width="max-w-xl"
      pillText="Visitor Pass"
    >
      <div className="space-y-6">
        <div className="rounded-[1.75rem] border-2 border-dashed border-premium-gold/25 bg-gradient-to-br from-gray-50 to-white p-4">
          <div className="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between bg-gradient-to-r from-premium-black to-gray-800 px-4 py-3 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                <span className="text-sm font-black text-premium-black">P</span>
              </div>
              <h3 className="text-sm font-bold tracking-[0.16em]">
                VISITOR VEHICLE PASS
              </h3>
              <div className="h-9 w-9" />
            </div>

            <div className="space-y-4 p-5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  Vehicle Number
                </div>
                <div className="text-2xl font-black uppercase tracking-[0.18em] text-gray-900">
                  {session.plateNumber}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                    Entry Date
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{entryDate}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                    Entry Time
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{entryTime}</div>
                </div>
              </div>

              {session.barcodeImage && (
                <div className="flex justify-center pt-1">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-2">
                    <img
                      src={`data:image/png;base64,${session.barcodeImage}`}
                      alt="Barcode"
                      className="h-20 w-36 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={generatePDF}
            disabled={isDownloading}
            className={`${primaryButtonClass} flex-1 bg-primary-blue hover:bg-blue-700`}
          >
            <Printer className="mr-2 h-4 w-4" />
            <span>{isDownloading ? "Generating..." : "Download PDF"}</span>
          </button>
          <button onClick={onHome} className={`${mutedButtonClass} flex-1`}>
            <Home className="mr-2 h-4 w-4" />
            Return Home
          </button>
        </div>
      </div>
    </KioskPanel>
  );
};

const SuccessScreen = ({ session, onHome }) => {
  const isExit = session.flowType === "exit";
  const isDenied = session.accessDenied;
  const title = isDenied ? "Access Denied" : (isExit ? "Exit Approved" : "Access Granted");
  const subtitle =
    session.message ||
    (isExit
      ? `${session.vehicleCategory} vehicle can proceed to exit.`
      : `${session.vehicleCategory} vehicle has been registered successfully.`);

  return (
    <KioskPanel
      title={title}
      subtitle={subtitle}
      icon={isDenied ? X : CheckCircle}
      accent={isDenied ? "red" : "green"}
      width="max-w-lg"
      pillText={isDenied ? "Access Denied" : (isExit ? "Exit Approved" : "Entry Approved")}
    >
      <div className="text-center">
        <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] shadow-sm ${
          isDenied ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
        }`}>
          {isDenied ? <X className="h-12 w-12" /> : <CheckCircle className="h-12 w-12" />}
        </div>
        <div className="mb-2 text-4xl font-black uppercase tracking-[0.2em] text-gray-900">
          {session.plateNumber}
        </div>
        <div className={`mb-6 inline-flex rounded-full border px-4 py-1 text-xs font-bold uppercase tracking-[0.16em] ${
          isDenied ? "border-red-100 bg-red-50 text-red-600" : "border-blue-100 bg-blue-50 text-primary-blue"
        }`}>
          {session.vehicleCategory}
        </div>

        <button onClick={onHome} className={primaryButtonClass}>
          <Home className="mr-2 h-4 w-4 text-premium-gold" />
          Return Home
        </button>
      </div>
    </KioskPanel>
  );
};

const VideoScreen = ({ onVehicleDetected, playlist = [] }) => {
  const [detectedPlate, setDetectedPlate] = useState("");
  const [statusText, setStatusText] = useState("Waiting for ANPR camera...");
  const lastProcessedSignatureRef = useRef("");
  const backgroundVideos = playlist.length
    ? playlist
    : [
      {
        id: "default-kiosk-background",
        title: "Default Kiosk Background",
        sourceUrl: DEFAULT_KIOSK_BACKGROUND_VIDEO,
      },
    ];
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const playlistSignature = backgroundVideos.map((video) => video.id).join("|");
  const activeBackgroundVideo =
    backgroundVideos[currentVideoIndex] || backgroundVideos[0];

  useEffect(() => {
    setCurrentVideoIndex(0);
  }, [playlistSignature]);

  useEffect(() => {
    let active = true;
    let isProcessing = false;

    const poll = async () => {
      if (!active || isProcessing) return;
      isProcessing = true;

      try {
        const response = await fetch(`${KIOSK_API_URL}?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        const session = normalizeKioskPayload(json);

        if (session) {
          const signature = [
            session.flowType,
            session.plateNumber,
            session.entryTime || "",
            session.exitTime || "",
            session.message || "",
          ].join("|");

          if (signature === lastProcessedSignatureRef.current) {
            return;
          }

          lastProcessedSignatureRef.current = signature;
          setDetectedPlate(session.plateNumber);
          setStatusText(
            session.flowType === "exit"
              ? "Vehicle found. Preparing exit flow..."
              : "Vehicle found. Preparing entry flow..."
          );

          setTimeout(() => {
            if (active) onVehicleDetected(session);
          }, 900);
        } else {
          setStatusText("Waiting for ANPR camera...");
        }
      } catch (error) {
        setStatusText("Waiting for camera data...");
      } finally {
        isProcessing = false;
      }
    };

    poll();
    const intervalId = setInterval(poll, 2000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [onVehicleDetected]);

  return (
    <div className="fixed inset-0 bg-black">
      <TizenVideoPlayer
        src={activeBackgroundVideo.sourceUrl}
        fileType={activeBackgroundVideo.fileType}
        loop={backgroundVideos.length === 1}
        poster={activeBackgroundVideo.posterUrl}
        className="absolute inset-0 h-full w-full object-cover"
        onEnded={() => {
          if (backgroundVideos.length > 1) {
            setCurrentVideoIndex(
              (previousIndex) => (previousIndex + 1) % backgroundVideos.length
            );
          }
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/65" />

      <div className="absolute left-0 right-0 top-0 p-5 sm:p-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-[2rem] border border-white/20 bg-white/12 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <span className="font-logo text-xl font-black text-premium-black">P</span>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
                Premium Kiosk
              </p>
              <h1 className="font-logo text-2xl font-black tracking-wide text-white">
                Pro Parking
              </h1>
            </div>
          </div>
          <div className="hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70 md:inline-flex">
            ANPR Monitoring Live
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
        <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/10 bg-white/10 px-6 py-5 text-center backdrop-blur-xl">
          <p className="text-lg font-bold text-white">Drive up to the camera</p>
          <p className="mt-1 text-sm font-medium text-white/70">
            Vehicle type and flow will be detected automatically
          </p>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="w-full max-w-xl overflow-hidden rounded-[2.25rem] border border-white/20 bg-white/12 p-6 text-center shadow-2xl backdrop-blur-2xl sm:p-8">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white text-premium-black shadow-lg">
            <Car className="h-10 w-10 text-premium-gold" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
            Automatic Detection
          </p>
          <h3 className="mt-2 text-3xl font-black text-white">ANPR Monitoring</h3>
          <p className="mx-auto mt-3 max-w-lg text-base font-medium leading-7 text-white/75">
            {statusText}
          </p>

          <div className="mt-6 rounded-[1.75rem] border border-white/15 bg-white/90 p-5 text-left shadow-xl">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
              Detected Number Plate
            </div>
            <div className="rounded-[1.25rem] border border-premium-gold/20 bg-gradient-to-br from-gray-50 to-white px-5 py-4 text-center text-3xl font-black uppercase tracking-[0.26em] text-gray-900">
              {detectedPlate || "Scanning..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = () => (
  <header className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
    <div className="glassmorphism rounded-[2rem] px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-premium-black to-gray-800 shadow-lg shadow-black/10">
            <Building2 className="h-6 w-6 text-premium-gold" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
              Premium Kiosk UI
            </p>
            <h1 className="font-logo text-2xl font-black tracking-wide text-gray-900">
              Pro Parking
            </h1>
            <p className="text-sm font-medium text-gray-500">Visitor Vehicle System</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/80 bg-gradient-to-br from-premium-black to-gray-800 px-4 py-3 text-white shadow-lg shadow-black/10">
          <Clock className="h-4 w-4 text-premium-gold" />
          <CurrentTime />
        </div>
      </div>
    </div>
  </header>
);

const CurrentTime = () => {
  const [time, setTime] = useState(new Date());
  const timeZone = useAppTimeZone();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <span className="block text-base font-black tabular-nums">
        {new Intl.DateTimeFormat("en-US", {
          timeZone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(time)}
      </span>
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
        {new Intl.DateTimeFormat("en-US", {
          timeZone,
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(time)}
      </div>
    </div>
  );
};

const HospitalKioskApp = () => {
  const [screen, setScreen] = useState("video");
  const [session, setSession] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [backgroundVideos, setBackgroundVideos] = useState([]);

  const loadBackgroundVideos = useCallback(async () => {
    try {
      const storedVideos = await getStoredKioskVideos();
      setBackgroundVideos(storedVideos);
    } catch (error) {
      console.error("Failed to load kiosk background videos:", error);
      setBackgroundVideos([]);
    }
  }, []);

  useEffect(() => {
    loadBackgroundVideos();

    const syncBackgroundVideos = () => {
      loadBackgroundVideos();
    };

    window.addEventListener(APP_KIOSK_VIDEOS_EVENT, syncBackgroundVideos);
    window.addEventListener("storage", syncBackgroundVideos);

    return () => {
      window.removeEventListener(APP_KIOSK_VIDEOS_EVENT, syncBackgroundVideos);
      window.removeEventListener("storage", syncBackgroundVideos);
    };
  }, [loadBackgroundVideos]);

  const content = useMemo(() => {
    if (!session) return null;

    if (screen === "main") {
      return (
        <PlateEditorScreen
          plateNumber={session.plateNumber}
          flowType={session.flowType}
          vehicleCategory={session.vehicleCategory}
          onSubmit={(nextPlateNumber) => {
            const nextSession = { ...session, plateNumber: nextPlateNumber };
            setSession(nextSession);

            if (nextSession.flowType === "exit" && nextSession.requiresPayment) {
              setScreen("payment");
              return;
            }

            if (nextSession.flowType === "entry" && nextSession.requiresPrint) {
              setScreen("confirmation");
              return;
            }

            setScreen("success");
          }}
          onCancel={() => {
            setSession(null);
            setScreen("video");
          }}
        />
      );
    }

    if (screen === "confirmation") {
      return (
        <EntryConfirmationScreen
          session={session}
          onBack={() => setScreen("main")}
          onConfirm={() => setScreen("print")}
          onCancel={() => {
            setSession(null);
            setScreen("video");
          }}
        />
      );
    }

    if (screen === "payment") {
      return (
        <PaymentScreen
          session={session}
          onBack={() => setScreen("main")}
          onCancel={() => {
            setSession(null);
            setScreen("video");
          }}
          onPaid={(paymentMode) => {
            setSession((prev) => ({
              ...prev,
              requiresPayment: false,
              message: `Payment received by ${paymentMode}. Exit approved.`,
            }));
            setScreen("success");
          }}
        />
      );
    }

    if (screen === "print") {
      return (
        <PrintPassScreen
          session={session}
          onHome={() => {
            setSession(null);
            setScreen("video");
          }}
        />
      );
    }

    if (screen === "success") {
      return (
        <SuccessScreen
          session={session}
          onHome={() => {
            setSession(null);
            setScreen("video");
          }}
        />
      );
    }

    return null;
  }, [screen, session]);

  useEffect(() => {
    const inactivityTimer = setInterval(() => {
      if (Date.now() - lastActivity > 45000 && screen !== "video") {
        setSession(null);
        setScreen("video");
      }
    }, 1000);

    return () => clearInterval(inactivityTimer);
  }, [lastActivity, screen]);

  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());

    window.addEventListener("click", updateActivity);
    window.addEventListener("touchstart", updateActivity);
    window.addEventListener("keydown", updateActivity);

    return () => {
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      window.removeEventListener("keydown", updateActivity);
    };
  }, []);

  if (screen === "video") {
    return (
      <VideoScreen
        playlist={backgroundVideos}
        onVehicleDetected={(nextSession) => {
          setSession(nextSession);
          if (nextSession.accessDenied) {
            setScreen("success");
          } else if (nextSession.flowType === "exit" && nextSession.requiresPayment) {
            setScreen("payment");
          } else if (nextSession.flowType === "entry" && nextSession.requiresPrint) {
            setScreen("confirmation");
          } else {
            setScreen("success");
          }
          setLastActivity(Date.now());
        }}
      />

    );
  }

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-premium-gray"
      onClick={() => setLastActivity(Date.now())}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-premium-gold/15 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-slate-200/60 blur-3xl" />
      </div>

      <Header />

      <div className="relative z-10 flex flex-grow items-center justify-center px-4 py-8 sm:px-6">
        {content}
      </div>

      <footer className="relative z-10 border-t border-white/70 bg-white/70 py-3 text-center text-xs font-medium text-gray-500 backdrop-blur-xl">
        <p>&copy; 2023 Pro Parking</p>
      </footer>
    </div>
  );
};

export default HospitalKioskApp;
