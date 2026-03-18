#!/usr/bin/env python3
"""
Generate a realistic *fictional* EHR PDF for demos.
No external dependencies: writes a minimal PDF with text.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path


def pdf_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(lines: list[str]) -> bytes:
    # Minimal PDF: Catalog, Pages, Page, Font, Contents.
    # Coordinates: origin bottom-left. We'll place text from top down.
    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"

    # Content stream
    font_size = 10
    left = 50
    top = 792 - 60  # letter height 792pt
    leading = 13

    content_parts: list[str] = []
    content_parts.append("BT")
    content_parts.append(f"/F1 {font_size} Tf")
    content_parts.append(f"{left} {top} Td")
    for i, line in enumerate(lines):
        if i > 0:
            content_parts.append(f"0 -{leading} Td")
        content_parts.append(f"({pdf_escape(line)}) Tj")
    content_parts.append("ET")
    content = ("\n".join(content_parts) + "\n").encode("utf-8")

    objects: list[bytes] = []

    # 1 0 obj: Catalog
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    # 2 0 obj: Pages
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    # 3 0 obj: Page
    objects.append(
        b"<< /Type /Page /Parent 2 0 R "
        b"/MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> "
        b"/Contents 5 0 R >>"
    )
    # 4 0 obj: Font
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    # 5 0 obj: Contents stream
    objects.append(
        b"<< /Length " + str(len(content)).encode("ascii") + b" >>\nstream\n" + content + b"endstream"
    )

    # Build body and xref offsets
    body = bytearray()
    offsets: list[int] = [0]  # object 0 is free
    body.extend(header)

    for idx, obj in enumerate(objects, start=1):
        offsets.append(len(body))
        body.extend(f"{idx} 0 obj\n".encode("ascii"))
        body.extend(obj)
        body.extend(b"\nendobj\n")

    xref_start = len(body)
    body.extend(b"xref\n")
    body.extend(f"0 {len(offsets)}\n".encode("ascii"))
    body.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        body.extend(f"{off:010d} 00000 n \n".encode("ascii"))

    body.extend(b"trailer\n")
    body.extend(f"<< /Size {len(offsets)} /Root 1 0 R >>\n".encode("ascii"))
    body.extend(b"startxref\n")
    body.extend(f"{xref_start}\n".encode("ascii"))
    body.extend(b"%%EOF\n")
    return bytes(body)


def main() -> None:
    today = date.today().isoformat()
    lines = [
        "SINGAPORE HEALTHHUB (SIMULATION) — OUTPATIENT SUMMARY",
        f"Generated for CAREHIVE demo • {today}",
        "",
        "Patient: Racshanyaa Jagadish (Fictional)        NRIC: SXXXX123A (masked)",
        "DOB: 1978-06-14   Sex: Female   Phone: +65 XXXX-XXXX (masked)",
        "Address: (masked)   Primary Care: Queenstown Polyclinic (simulated)",
        "",
        "Problem List / Diagnoses",
        " - Type 2 Diabetes Mellitus (T2DM) — dx 2019",
        " - Hypertension — dx 2021",
        " - Hyperlipidemia — dx 2020",
        "",
        "Allergies",
        " - Penicillin: rash (reported 2005)",
        " - Shellfish: urticaria (reported 2012)",
        "",
        "Current Medications",
        " - Metformin 500 mg tablet — 1 tab PO BID with meals",
        " - Amlodipine 5 mg tablet — 1 tab PO once daily",
        " - Atorvastatin 20 mg tablet — 1 tab PO at bedtime",
        " - Vitamin D3 1000 IU — 1 cap PO once daily",
        "",
        "Recent Encounter (Simulated)",
        " - Facility: National University Polyclinics (NUP) — Kent Ridge",
        " - Date: 2026-02-28",
        " - Reason: Routine chronic care follow-up",
        " - Notes: Counselled on diet (reduce sugary drinks), increase activity.",
        "          Discussed adherence aids and home BP monitoring.",
        "",
        "Vitals (Last Visit)",
        " - BP: 138/84 mmHg    HR: 78 bpm    Weight: 71.2 kg    Height: 1.60 m",
        " - BMI: 27.8 kg/m^2",
        "",
        "Lab Results (Most Recent)",
        " - HbA1c: 7.4% (2026-02-20) [target individualized]",
        " - LDL-C: 2.1 mmol/L (2026-02-20)",
        " - Creatinine: 68 umol/L (2026-02-20)  eGFR: >90",
        " - Urine ACR: 2.8 mg/mmol (2026-02-20)",
        "",
        "Immunisations",
        " - Influenza: 2025-10 (given)",
        " - COVID-19 Booster: 2025-11 (given)",
        " - Pneumococcal: not recorded (consider based on guidelines)",
        "",
        "Symptoms / Self-report",
        " - Occasional fatigue; denies chest pain/SOB.",
        " - Sleep: fragmented, 5–6 hours on weekdays.",
        "",
        "Care Plan (Next 4–8 weeks)",
        " - Medication adherence focus: set reminders, align doses with routine.",
        " - Activity: brisk walk 20–30 min, 5 days/week; start with 10 min.",
        " - Nutrition: plate method; swap sweetened drinks for water/unsweetened.",
        " - Follow-up: repeat HbA1c in 3 months; home BP log review.",
        "",
        "Administrative",
        " - This PDF is fictional and for demonstration only.",
        " - Do not use for medical decisions.",
    ]

    # This script lives at: <repo>/carehive/scripts/...
    # Output into: <repo>/carehive/frontend/public/...
    out = Path(__file__).resolve().parents[1] / "frontend" / "public" / "dummy-ehr.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(make_pdf(lines))
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

