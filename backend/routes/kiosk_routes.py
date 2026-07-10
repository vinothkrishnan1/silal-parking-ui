from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from uuid import uuid4

from flask import jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

last_received_data = None

KIOSK_STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage" / "kiosk_videos"
KIOSK_METADATA_FILE = KIOSK_STORAGE_DIR / "metadata.json"
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".ogg", ".mov", ".m4v"}


def _ensure_kiosk_storage():
    KIOSK_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    if not KIOSK_METADATA_FILE.exists():
        KIOSK_METADATA_FILE.write_text("[]", encoding="utf-8")


def _load_kiosk_video_metadata():
    _ensure_kiosk_storage()

    try:
        raw_value = KIOSK_METADATA_FILE.read_text(encoding="utf-8")
        payload = json.loads(raw_value or "[]")
        return payload if isinstance(payload, list) else []
    except (OSError, json.JSONDecodeError) as error:
        logger.error("Failed to read kiosk video metadata: %s", error)
        return []


def _save_kiosk_video_metadata(entries):
    _ensure_kiosk_storage()
    KIOSK_METADATA_FILE.write_text(json.dumps(entries, indent=2), encoding="utf-8")


def _serialize_kiosk_video(entry):
    stored_name = entry.get("storedName", "")
    base_url = request.host_url.rstrip("/")
    return {
        "id": entry.get("id"),
        "title": entry.get("title"),
        "fileName": entry.get("fileName"),
        "fileType": entry.get("fileType"),
        "uploadedAt": entry.get("uploadedAt"),
        "sourceUrl": f"{base_url}/api/kiosk-videos/files/{stored_name}" if stored_name else None,
    }


def _sorted_kiosk_videos(entries):
    return sorted(entries, key=lambda entry: entry.get("uploadedAt") or "")


def register_kiosk_routes(app):
    @app.route("/receive_data", methods=["POST", "GET"])
    def receive_data():
        global last_received_data

        if request.method == "POST":
            data = request.json
            if not data:
                return jsonify({"status": "error", "message": "No data received"}), 400

            last_received_data = data
            logger.info("Received data from kiosk/ANPR: %s", data.get("license_plate"))

            return jsonify({"status": "success", "message": "Data received successfully"}), 200

        if last_received_data:
            data_to_return = last_received_data
            last_received_data = None
            return jsonify(
                {"status": "success", "message": "Last data sent", "data": data_to_return}
            ), 200

        return jsonify({"status": "success", "message": "No new data", "data": None}), 200

    @app.route("/api/kiosk-videos", methods=["GET"])
    def list_kiosk_videos():
        metadata = _sorted_kiosk_videos(_load_kiosk_video_metadata())
        return jsonify([_serialize_kiosk_video(entry) for entry in metadata]), 200

    @app.route("/api/kiosk-videos", methods=["POST"])
    def upload_kiosk_videos():
        uploaded_files = request.files.getlist("videos")
        raw_titles = request.form.get("titles", "[]")

        if not uploaded_files:
            return jsonify({"message": "No video files uploaded."}), 400

        try:
            parsed_titles = json.loads(raw_titles)
            titles = parsed_titles if isinstance(parsed_titles, list) else []
        except json.JSONDecodeError:
            titles = []

        metadata = _load_kiosk_video_metadata()
        new_entries = []

        for index, uploaded_file in enumerate(uploaded_files):
            if not uploaded_file or not uploaded_file.filename:
                continue

            original_name = secure_filename(uploaded_file.filename)
            extension = Path(original_name).suffix.lower()

            if extension not in ALLOWED_VIDEO_EXTENSIONS:
                return jsonify(
                    {"message": f"Unsupported video format for {uploaded_file.filename}."}
                ), 400

            video_id = str(uuid4())
            stored_name = f"{video_id}{extension}"
            stored_path = KIOSK_STORAGE_DIR / stored_name
            uploaded_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            title = str(titles[index]).strip() if index < len(titles) and titles[index] else ""

            uploaded_file.save(stored_path)

            entry = {
                "id": video_id,
                "title": title or Path(original_name).stem,
                "fileName": original_name,
                "fileType": uploaded_file.mimetype or "video/mp4",
                "storedName": stored_name,
                "uploadedAt": uploaded_at,
            }
            metadata.append(entry)
            new_entries.append(entry)

        _save_kiosk_video_metadata(metadata)

        return jsonify([_serialize_kiosk_video(entry) for entry in new_entries]), 201

    @app.route("/api/kiosk-videos/<video_id>", methods=["DELETE"])
    def delete_kiosk_video(video_id):
        metadata = _load_kiosk_video_metadata()
        target_entry = next((entry for entry in metadata if entry.get("id") == video_id), None)

        if not target_entry:
            return jsonify({"message": "Kiosk video not found."}), 404

        stored_name = target_entry.get("storedName")
        if stored_name:
            stored_path = KIOSK_STORAGE_DIR / stored_name
            try:
                if stored_path.exists():
                    stored_path.unlink()
            except OSError as error:
                logger.error("Failed to delete kiosk video file %s: %s", stored_name, error)
                return jsonify({"message": "Failed to delete kiosk video file."}), 500

        remaining_entries = [entry for entry in metadata if entry.get("id") != video_id]
        _save_kiosk_video_metadata(remaining_entries)
        return jsonify({"status": "success"}), 200

    @app.route("/api/kiosk-videos/files/<path:filename>", methods=["GET"])
    def serve_kiosk_video_file(filename):
        _ensure_kiosk_storage()
        return send_from_directory(KIOSK_STORAGE_DIR, filename, conditional=True)
