import json
import os
from copy import deepcopy

import yaml


def _write_json(path: str, obj: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")


def _sub_spec(full: dict, title_suffix: str, include_prefixes: list[str]) -> dict:
    spec = deepcopy(full)
    spec["info"]["title"] = f'{full.get("info", {}).get("title", "API")} — {title_suffix}'

    paths = full.get("paths", {}) or {}
    spec["paths"] = {
        p: v
        for p, v in paths.items()
        if any(p == pref or p.startswith(pref) for pref in include_prefixes)
    }
    return spec


def main() -> None:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    in_path = os.path.join(repo_root, "openapi.yaml")
    out_dir = os.path.join(repo_root, "api-specs")

    with open(in_path, "r", encoding="utf-8") as f:
        full = yaml.safe_load(f)

    _write_json(os.path.join(out_dir, "apispec.json"), full)

    _write_json(os.path.join(out_dir, "apispec.tutor.json"), _sub_spec(full, "Tutor", ["/tutor"]))
    _write_json(os.path.join(out_dir, "apispec.student.json"), _sub_spec(full, "Student", ["/student"]))
    _write_json(os.path.join(out_dir, "apispec.interest.json"), _sub_spec(full, "Interest", ["/interest"]))
    _write_json(os.path.join(out_dir, "apispec.trials.json"), _sub_spec(full, "Trials", ["/trials"]))
    _write_json(os.path.join(out_dir, "apispec.credit.json"), _sub_spec(full, "Credit", ["/graphql"]))

    _write_json(
        os.path.join(out_dir, "apispec.composites.json"),
        _sub_spec(
            full,
            "Composite Flows",
            [
                "/indicate-interest",
                "/interested-students",
                "/accept-student",
                "/initiate-payment",
                "/confirm-booking",
                "/make-trial-booking",
                "/continue-lessons",
                "/cancel-trial-booking",
                "/cancel-trial",
            ],
        ),
    )

    print("Exported JSON specs to:", out_dir)


if __name__ == "__main__":
    main()

