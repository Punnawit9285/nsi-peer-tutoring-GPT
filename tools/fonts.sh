#!/bin/sh
# Download the web fonts once into dist/fonts/ so the PDF build does not depend on headless Chrome reaching Google Fonts.
# Writes dist/fonts/fonts.css with local url()s. Fonts: Bai Jamjuree, IBM Plex Sans / Sans Thai / Mono (SIL OFL).
set -e
cd "$(dirname "$0")/.."
[ -s dist/fonts/fonts.css ] && exit 0
mkdir -p dist/fonts
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
CSS="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"
curl -fsS -A "$UA" "$CSS" -o dist/fonts/remote.css
i=0
grep -o 'https://fonts.gstatic.com/[^)]*\.woff2' dist/fonts/remote.css | sort -u | while read -r u; do
  f="f$(printf '%s' "$u" | sha1sum | cut -c1-12).woff2"
  [ -s "dist/fonts/$f" ] || curl -fsS "$u" -o "dist/fonts/$f"
  printf 's#%s#%s#g\n' "$u" "$f"
done > dist/fonts/rewrite.sed
sed -f dist/fonts/rewrite.sed dist/fonts/remote.css > dist/fonts/fonts.css
rm dist/fonts/remote.css dist/fonts/rewrite.sed
echo "fonts: $(ls dist/fonts/*.woff2 | wc -l | tr -d ' ') files, $(du -sh dist/fonts | cut -f1)"
