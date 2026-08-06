#!/usr/bin/env python3
"""Markdown → styled PDF via WeasyPrint. Built for these two documents:
   wide tables, ASCII box-drawing diagrams and code blocks."""
import sys, re, markdown
from weasyprint import HTML, CSS

src, out, title, subtitle = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
md = open(src, encoding='utf-8').read()

# Emoji with no glyph in the installed fonts would render as empty boxes.
# Substitute them with styled text so nothing is lost or shows as tofu.
EMOJI = {
    '⚠️': '<span class="tag warn">WARNING</span>',
    '⚠':  '<span class="tag warn">WARNING</span>',
    '⭐': '<span class="tag star">KEY</span>',
    '❌': '<span class="no">NO</span>',
    '✅': '<span class="yes">YES</span>',
    '🙂': ':)',
}
for k, v in EMOJI.items():
    md = md.replace(k, v)

# Strip the in-document Table of Contents — the PDF gets its own bookmarks,
# and the anchor links don't work on paper.
md = re.sub(r'^## Table of Contents\n(?:.*\n)*?^---\n', '', md, flags=re.M)

body = markdown.markdown(md, extensions=['tables', 'fenced_code', 'sane_lists', 'attr_list'])

CSS_TEXT = """
@page {
  size: A4; margin: 17mm 15mm 18mm 15mm;
  @top-right   { content: "TITLEHERE"; font-family: "DejaVu Sans"; font-size: 7.5pt; color: #8a9a93; }
  @bottom-center { content: counter(page) " / " counter(pages); font-family: "DejaVu Sans"; font-size: 8pt; color: #8a9a93; }
}
@page :first { @top-right { content: ""; } }

body { font-family: "DejaVu Sans"; font-size: 9.3pt; line-height: 1.5; color: #23312d; }

h1 { font-size: 17pt; color: #2D6A4F; margin: 22pt 0 8pt; padding-bottom: 5pt;
     border-bottom: 2.2pt solid #2D6A4F; page-break-after: avoid; page-break-before: always; }
h1:first-of-type { page-break-before: avoid; }
h2 { font-size: 12.5pt; color: #355C4D; margin: 15pt 0 6pt; page-break-after: avoid; }
h3 { font-size: 10.5pt; color: #4A7A66; margin: 11pt 0 4pt; page-break-after: avoid; }
h4 { font-size: 9.6pt; color: #5E8B7E; margin: 9pt 0 3pt; page-break-after: avoid; }
p  { margin: 0 0 6pt; orphans: 2; widows: 2; }

table { width: 100%; border-collapse: collapse; margin: 7pt 0 11pt;
        font-size: 7.9pt; page-break-inside: avoid; }
thead { background: #2D6A4F; color: #fff; }
th { padding: 4.5pt 5pt; text-align: left; font-weight: bold; font-size: 7.6pt; }
td { padding: 4pt 5pt; border-bottom: 0.5pt solid #d8e5df; vertical-align: top; }
tbody tr:nth-child(even) { background: #f4f9f7; }

code { font-family: "DejaVu Sans Mono"; font-size: 8pt;
       background: #eef5f2; padding: 0.5pt 2.5pt; border-radius: 2pt; color: #1d4a38; }
pre  { font-family: "DejaVu Sans Mono"; background: #f7faf9; border: 0.6pt solid #d8e5df;
       border-left: 2.5pt solid #5E8B7E; border-radius: 3pt; padding: 6pt 8pt;
       margin: 7pt 0 10pt; page-break-inside: avoid;
       white-space: pre; overflow-wrap: normal; }
/* Diagrams and code must not wrap — 6.4pt keeps the widest ASCII art on one line */
/* line-height must be 1.0 or box-drawing characters leave vertical gaps
   and the ASCII diagrams look broken */
pre code { background: none; padding: 0; font-size: 6.5pt; line-height: 1.0; color: #23312d;
           letter-spacing: -0.012em; }  /* closes hairline gaps between box-drawing glyphs */

blockquote { margin: 7pt 0; padding: 5pt 9pt; background: #f4f9f7;
             border-left: 2.5pt solid #D8A48F; page-break-inside: avoid; }
blockquote p { margin: 0 0 3pt; }

ul, ol { margin: 4pt 0 8pt; padding-left: 15pt; }
li { margin-bottom: 2.5pt; }
hr { border: none; border-top: 0.6pt solid #d8e5df; margin: 13pt 0; }
strong { color: #1d4a38; }
a { color: #2D6A4F; text-decoration: none; }

.tag { font-size: 7pt; font-weight: bold; padding: 0.5pt 3pt; border-radius: 2pt; color: #fff; }
.warn { background: #C0392B; }
.star { background: #B7791F; }
.yes { color: #2f7d32; font-weight: bold; }
.no  { color: #C0392B; font-weight: bold; }

/* Title page */
.cover { text-align: center; padding-top: 62mm; page-break-after: always; }
.cover .t   { font-size: 25pt; font-weight: bold; color: #2D6A4F; margin-bottom: 5pt; }
.cover .s   { font-size: 12pt; color: #5E8B7E; margin-bottom: 30pt; }
.cover .rule{ width: 55mm; height: 2.2pt; background: #D8A48F; margin: 0 auto 30pt; }
.cover .m   { font-size: 9.6pt; color: #23312d; line-height: 1.85; }
.cover .f   { font-size: 8pt; color: #8a9a93; margin-top: 34pt; }
"""

cover = f"""<div class="cover">
  <div class="t">CounselConnect</div>
  <div class="s">{subtitle}</div>
  <div class="rule"></div>
  <div class="m">
    <strong>{title}</strong><br>
    AI-Assisted Counseling Management Platform<br><br>
    Major Project &nbsp;·&nbsp; Team ID: P7_056<br>
    Department of Computer Engineering<br>
    Faculty of Engineering &amp; Technology<br><br>
    Farhan Sargath &nbsp;·&nbsp; Nakul Dabhi &nbsp;·&nbsp; Kavya Vaghela<br><br>
    <span style="color:#5E8B7E">Internal Guide: Prof. Priyanka Mangi</span>
  </div>
  <div class="f">Generated from the CounselConnect source code</div>
</div>"""

html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>{title}</title></head><body>{cover}{body}</body></html>"
HTML(string=html).write_pdf(out, stylesheets=[CSS(string=CSS_TEXT.replace("TITLEHERE", title))])
print(f"  wrote {out}")
