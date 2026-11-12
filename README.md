# Nervous System I · peer tutoring

> Review edition: verify flagged recalled items before recording. The repository and its cropped course figures are public.

## Open it

| Student deck | Tutor deck | Student handout |
|---|---|---|
| [student.html](https://punnawit9285.github.io/nsi-peer-tutoring/student.html) | [tutor.html](https://punnawit9285.github.io/nsi-peer-tutoring/tutor.html) | [student.pdf](https://punnawit9285.github.io/nsi-peer-tutoring/student.pdf?v=583f4208) |

Open both decks in the same browser and enable **Follow student** in the tutor deck to follow the student card.

The [390 px review frame](https://punnawit9285.github.io/nsi-peer-tutoring/tools/mobile-preview.html) shows both decks at phone width.

## Sections

| ID | Section | Kind | Concepts | Questions | Core | Blanks | Figures | PDF body pages |
|---|---|---|---:|---:|---:|---:|---:|---|
| B | Deep back and vertebral column | Lecture | 10 | 17 | 11 | 40 | 5 | 2–11 |
| I | Imaging of vertebral column and spinal cord | Lecture | 5 | 9 | 3 | 33 | 2 | 12–16 |
| N | Nervous tissue | Lecture | 10 | 17 | 9 | 43 | 4 | 17–26 |
| S | Spinal cord and peripheral nerve | Lecture | 9 | 16 | 8 | 36 | 3 | 27–35 |
| F | Deep structures of face | Lecture | 9 | 15 | 7 | 42 | 5 | 36–44 |
| K | Skull | Lecture | 9 | 16 | 10 | 40 | 4 | 45–53 |
| U | Superficial face and neck | Lecture | 8 | 14 | 8 | 31 | 4 | 54–61 |
| O | Oral cavity and floor of mouth | Lecture | 10 | 17 | 9 | 44 | 4 | 62–71 |
| D | Deep structures of neck | Lecture | 11 | 19 | 10 | 42 | 6 | 72–82 |
| C | Structures within cranial cavity | Lecture | 8 | 14 | 6 | 40 | 5 | 83–90 |
| A | ANS integration and regulation | Lecture | 5 | 6 | 2 | 30 | 2 | 91–95 |
| P | ANS physiology | Lecture | 5 | 7 | 3 | 30 | 1 | 96–100 |
| M | Membrane potential | Lecture | 6 | 9 | 5 | 33 | 0 | 101–106 |
| J | Physiology of nerve and NMJ | Lecture | 6 | 11 | 7 | 31 | 0 | 107–112 |
| L | Nerve and NMJ lab | Lab | 5 | 5 | 2 | 27 | 1 | 113–117 |
| E | Eye and orbit | Lecture | 9 | 17 | 8 | 41 | 5 | 118–126 |
| R | Physiology of reflex | Lecture | 5 | 10 | 5 | 26 | 0 | 127–131 |
| G | Light in medicine | Lecture | 6 | 9 | 5 | 31 | 0 | 132–137 |
| T | Ear | Lecture | 10 | 20 | 10 | 37 | 6 | 138–147 |
| H | ANS of head and neck | Lecture | 5 | 8 | 3 | 28 | 2 | 148–152 |
| W | Physics of sound and hearing | Lecture | 6 | 10 | 6 | 36 | 0 | 153–158 |
| V | SGD wrap-up | Lab | 5 | 7 | 3 | 25 | 1 | 159–163 |
| X | Upper and lower limb spot anatomy | Lab | 5 | 10 | 5 | 25 | 5 | 164–168 |

## Pages and build

- `index.html` and `student.html`: audience deck; `tutor.html`: second-screen notes; `student.pdf`: A4 handout.
- `dist/deck.html` and `dist/notes.html`: copies with relative `dist/img/` figures.
- `node check.js` validates IDs, answer indexes, source tags, Thai data keys, and recording scripts.
- `node build.js all` rebuilds both self-contained HTML pages.
- `tools/pdf.sh` writes `dist/print.html`, creates `student.pdf` in two passes, validates concept-page markers and cross-references, and refreshes this PDF version tag.
- The PDF renderer uses ReportLab in this environment; the reference Chrome print pipeline could not open local content here.

## Sources and review

The [source audit](SOURCE_AUDIT.md) lists every attachment, where the course content comes from, the known answer-key conflicts, and review limitations. The original PDFs and the Rohen atlas are not copied into this public repository.
