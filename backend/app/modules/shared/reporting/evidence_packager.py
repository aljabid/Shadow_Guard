import os
import zipfile
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
OUTPUT_DIR = "/tmp/evidence"
os.makedirs(OUTPUT_DIR, exist_ok=True)


async def create_evidence_package(report_id: str, pdf_path: str, raw_data: dict, module_id: str) -> str:
    package_path = os.path.join(OUTPUT_DIR, f"{report_id}_evidence.zip")
    with zipfile.ZipFile(package_path, "w", zipfile.ZIP_DEFLATED) as zf:
        if os.path.exists(pdf_path):
            zf.write(pdf_path, f"{module_id}_report.pdf")
        zf.writestr(f"{module_id}_raw_data.json", json.dumps(raw_data, indent=2, ensure_ascii=False, default=str))
        manifest = {"report_id": report_id, "module_id": module_id,
                    "generated_at": datetime.utcnow().isoformat()}
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))
    return package_path
