"""Read-only Blender capability probe; does not model, render, import or export.

Run with the discovered Blender executable on the requested execution host:
  blender --background --factory-startup --python-exit-code 1 --python scripts/blender/probe.py -- \
      --report work/blender-capabilities.json
"""
import argparse
import json
import platform
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True, type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
    try:
        import bpy
    except ImportError:
        parser.exit(2, "Blender bpy is unavailable. Run this script with the required host's Blender executable; no fallback is performed.\n")

    operators = {}
    for name, operator in (("import_scene.gltf", bpy.ops.import_scene.gltf),
                           ("export_scene.gltf", bpy.ops.export_scene.gltf)):
        try:
            rna = operator.get_rna_type()
            operators[name] = {
                p.identifier: {"type": p.type,
                               **({"choices": [item.identifier for item in p.enum_items]}
                                  if p.type == "ENUM" else {})}
                for p in rna.properties if p.identifier != "rna_type"
            }
        except (RuntimeError, AttributeError) as exc:
            operators[name] = {"unavailable": str(exc)}

    report = {
        "blenderVersion": list(bpy.app.version),
        "blenderVersionString": bpy.app.version_string,
        "binaryPath": bpy.app.binary_path,
        "background": bpy.app.background,
        "hostname": platform.node(),
        "platform": platform.platform(),
        "pythonVersion": platform.python_version(),
        "operators": operators,
        "scope": "Capability discovery only; does not attest user-local execution or asset validation.",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Capability report: {args.report}")
    if any("unavailable" in value for value in operators.values()):
        raise RuntimeError("Required glTF operators unavailable; inspect capability report.")


if __name__ == "__main__":
    main()
