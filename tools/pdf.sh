#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node print.js
python tools/pdf_reportlab.py
V=$(sha1sum student.pdf | cut -c1-8)
if [ -f README.md ]; then sed -i -E "s#(nsi-peer-tutoring/student\.pdf)(\?v=[0-9a-f]+)?#\1?v=$V#g" README.md; fi
echo "student.pdf version $V"
