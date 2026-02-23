#!/usr/bin/env python3
import csv
from pathlib import Path


ROOT = Path("/Users/xisu/ProjectFiles/GitHub/BrainTalkTalk/braintalktalk")
DATA_DIR = ROOT / "data" / "k_wab"
INPUT_CSV = DATA_DIR / "result_entry_template.csv"
NORM_CSV = DATA_DIR / "aq_norm_sd.csv"
OUTPUT_CSV = DATA_DIR / "final_result_table.csv"


def age_band(age: int) -> str:
    return "65+" if age >= 65 else "15-65"


def edu_group(years: int) -> str:
    if years == 0:
        return "0"
    if 1 <= years <= 6:
        return "1-6"
    return "7+"


def sd_band(aq: float, m1: float, m2: float) -> str:
    if aq >= m1:
        return ">=-1SD"
    if aq >= m2:
        return "-1SD~-2SD"
    return "<-2SD"


def load_norms():
    norms = {}
    with NORM_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            key = (row["age_band"], row["education_years"])
            norms[key] = row
    return norms


def main():
    norms = load_norms()
    out_rows = []

    with INPUT_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    for row in rows:
        case_id = row["case_id"]
        age = int(float(row["age"]))
        edu = int(float(row["education_years"]))
        content = float(row["content_delivery_score_0_10"])
        dialog = float(row["fluency_dialog_score_0_10"])
        beach = float(row["fluency_beach_score_0_10"])
        aq = float(row["aq_score_0_100"])

        computed_fluency = round((dialog + beach) / 2.0, 2)
        computed_spont = round(content + computed_fluency, 2)

        a_band = age_band(age)
        e_group = edu_group(edu)
        norm = norms[(a_band, e_group)]
        m1 = float(norm["aq_minus_1sd"])
        m2 = float(norm["aq_minus_2sd"])
        band = sd_band(aq, m1, m2)

        print(f"[CASE] {case_id}")
        print(f"  age={age} -> age_band={a_band}")
        print(f"  education_years={edu} -> education_group={e_group}")
        print(f"  fluency_score_avg=(dialog {dialog} + beach {beach}) / 2 = {computed_fluency}")
        print(f"  spontaneous_total=content {content} + fluency_avg {computed_fluency} = {computed_spont}")
        print(
            "  aq_band compare:"
            f" aq={aq}, -1SD={m1}, -2SD={m2} -> {band}"
        )
        print("")

        out_rows.append(
            {
                "case_id": case_id,
                "eval_date": row["eval_date"],
                "age": age,
                "education_years": edu,
                "content_delivery_score_0_10": content,
                "fluency_dialog_score_0_10": dialog,
                "fluency_beach_score_0_10": beach,
                "fluency_score_avg_0_10": computed_fluency,
                "spontaneous_speech_total_0_20": computed_spont,
                "aq_score_0_100": aq,
                "aq_age_band": a_band,
                "aq_education_group": e_group,
                "aq_mean": norm["aq_mean"],
                "aq_minus_1sd": norm["aq_minus_1sd"],
                "aq_minus_2sd": norm["aq_minus_2sd"],
                "aq_sd_band": band,
            }
        )

    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as f:
        fieldnames = list(out_rows[0].keys()) if out_rows else []
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(out_rows)

    print(f"[DONE] wrote: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
