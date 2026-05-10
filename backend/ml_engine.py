import json
import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from schemas import KYCData

DEFAULT_MODEL_PATH = "/home/bindesh/kyc/llama-cpp-python/Qwen-3.5-0.8B-OCR.Q8_0.gguf"
DEFAULT_MMPROJ_PATH = "/home/bindesh/kyc/llama-cpp-python/Qwen-3.5-0.8B-OCR.mmproj-f16.gguf"
DEFAULT_MTMD_CLI_PATH = "/home/bindesh/Desktop/llama.cpp/build/bin/llama-mtmd-cli"

EXTRACTION_PROMPT = (
    "Extract fields from this Nepalese identity document. "
    "Return only JSON with exactly these keys: name, age, sex, address, and document_number. "
    "name must be the holder/person name only, not the document title, card type, nationality, or organization name. "
    "document_number must be the Card ID No, ID Card No, or card number value. "
    "address must be the text immediately after the label 'Country of Residence and Address'. "
    "For Non Resident Nepali cards, do not use 'Permanent Address in Nepal' as address when 'Country of Residence and Address' is visible. "
    "If both are visible, address must be the foreign residence/country address, not the Nepal permanent address. "
    "age must be 0 unless an age value is explicitly printed. "
    "sex must be an empty string unless a sex/gender field is explicitly printed; never output 0 for sex. "
    "Use empty strings for unreadable or absent text fields."
)


def _existing_path(env_name: str, default_path: str, label: str) -> str:
    path = os.environ.get(env_name, default_path)
    if not os.path.exists(path):
        raise FileNotFoundError(f"{label} not found: {path}")
    return path


def _write_png_image(image_bytes: bytes) -> str:
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as image_file:
            temp_path = image_file.name

        with tempfile.SpooledTemporaryFile() as source_file:
            source_file.write(image_bytes)
            source_file.seek(0)
            with Image.open(source_file) as image:
                image.convert("RGB").save(temp_path, format="PNG")
    except Exception:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)
        raise

    return temp_path


def _kyc_json_schema() -> str:
    schema = KYCData.model_json_schema()
    schema["additionalProperties"] = False
    return json.dumps(schema)


def _extract_json(output: str) -> str:
    start = output.find("{")
    end = output.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("OCR model did not return a JSON object")
    return output[start : end + 1]


def _run_mtmd_cli(image_path: str) -> str:
    command = [
        _existing_path("KYC_MTMD_CLI_PATH", DEFAULT_MTMD_CLI_PATH, "llama-mtmd CLI"),
        "-m",
        _existing_path("KYC_MODEL_PATH", DEFAULT_MODEL_PATH, "KYC model file"),
        "--mmproj",
        _existing_path("KYC_MMPROJ_PATH", DEFAULT_MMPROJ_PATH, "KYC multimodal projection file"),
        "--image",
        image_path,
        "-p",
        EXTRACTION_PROMPT,
        "--json-schema",
        _kyc_json_schema(),
        "-n",
        os.environ.get("KYC_MAX_TOKENS", "256"),
        "--temp",
        "0",
    ]

    try:
        result = subprocess.run(
            command,
            text=True,
            capture_output=True,
            timeout=int(os.environ.get("KYC_OCR_TIMEOUT", "300")),
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError("OCR model timed out") from exc

    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"llama-mtmd-cli failed with exit code {result.returncode}: {detail[-1000:]}")

    return result.stdout.strip()


def extract_kyc_data(image_bytes: bytes) -> KYCData:
    temp_path = None
    try:
        temp_path = _write_png_image(image_bytes)
        output = _run_mtmd_cli(temp_path)
        return KYCData.model_validate_json(_extract_json(output))
    finally:
        if temp_path:
            Path(temp_path).unlink(missing_ok=True)
