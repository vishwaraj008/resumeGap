# SkillGapAnalyzer — How I Built the Data Pipeline

Five notebooks, built in this order, that together pull skills out of a resume, match them against real job postings, and point the user toward courses and free videos for whatever's missing.

| # | File | What it does |
|---|---|---|
| 1 | `spacyData.ipynb` | Cleans the resume-NER dataset I train on |
| 2 | `nerTraining.ipynb` | Trains my spaCy model to pull SKILL entities out of resumes |
| — | `tfidf.ipynb` | The matching engine — user skills vs. job postings, TF-IDF |
| 3 | `course.ipynb` | Cleans a course catalog and indexes it by skill |
| 4 | `04_youtube_gemini_enrichment.ipynb` | Curates free YouTube resources per skill |

One thing I should fix: I named both `nerTraining.ipynb` and `tfidf.ipynb` "Notebook 2." They're unrelated pieces of work — I just wasn't paying attention when I labeled them. I'll rename one before this goes anywhere near a README.

Here's how they actually depend on each other:

```
spacyData.ipynb ──▶ nerTraining.ipynb ──▶ skill_ner model (reads a resume at inference time)

tfidf.ipynb ──▶ master_skills_vocab.json ──▶ course.ipynb ──▶ 04_youtube_gemini_enrichment.ipynb
(my own job dataset)   (shared vocab)         (course catalog)     (top skills, pulled from
                                                                     Notebook 2's distribution)
```

`tfidf.ipynb` doesn't touch the NER notebooks at all — different dataset, its own vectorizer, its own vocabulary. I reused that vocabulary in `course.ipynb` so "python" means the same thing everywhere in the system instead of drifting into three different spellings.

---

## 1. Resume NER Data Prep (`spacyData.ipynb`)

Source: the [Resume NER Training Dataset](https://www.kaggle.com/datasets/yashpwrr/resume-ner-training-dataset) on Kaggle.

I download it, check the raw structure and the label list, then normalize everything into a plain `{text, entities}` shape. From there: strip stray surrogate characters, drop empty or duplicate resumes, drop entities that don't hold up (out of bounds, empty, pure punctuation). Then I resolve overlapping entity spans — sorted by start position, longest one kept when two overlap — because spaCy's NER can't train on overlapping labels. After that I re-validate every span against spaCy's own tokenizer with `char_span`, make sure it produces valid BILUO tags, and cap resume length at 15,000 characters so one enormous outlier doesn't skew things. I run a quick EDA pass, keep only the `SKILL` label (the model only cares about technical skills, not names or dates), and split 80/20 with a fixed seed.

What I export to `SkillGapAnalyzer/prepared/` on Drive:

| File | Contents |
|---|---|
| `train_data.json` / `val_data.json` | `{"text": str, "entities": [[start, end, "SKILL"], ...]}` |
| `labels.json` | `["SKILL"]` |
| `dataset_stats.json` | Resume length and entity count stats |

Tools: pandas, NumPy, spaCy, scikit-learn's `train_test_split`, Kaggle API, matplotlib, tqdm.

---

## 2. Training the Skill NER Model (`nerTraining.ipynb`)

This picks up the four files from the prep notebook. I build a **blank spaCy pipeline** — `spacy.blank("en")` — with a fresh `ner` component and add `SKILL` as the only label. I trained from scratch rather than fine-tuning on top of a pretrained pipeline.

Training is 12 epochs, batch size 16, dropout 0.20, and I save a checkpoint whenever the loss improves so I'm not stuck with whatever the last epoch happened to produce. Once it's done I evaluate with spaCy's `Scorer` — precision, recall, F1, overall and per label — and plot both that and the loss curve so I can eyeball whether it actually converged. Then I run it against a few sample resumes I wrote by hand, and against a real resume I uploaded as a PDF and pulled text from with PyMuPDF, just to see it work on something messier than my test data.

What comes out of this notebook is the trained model itself, sitting on disk, ready to read a resume at inference time.

Tools: spaCy (`Scorer`, `Example`, `minibatch`, `displacy`), PyMuPDF (`fitz`), matplotlib, tqdm, pandas, NumPy.

---

## 3. The Job-Matching Engine (`tfidf.ipynb`)

Source: [Job Descriptions 2025 – Tech & Non-Tech Roles](https://www.kaggle.com/datasets/adityarajsrv/job-descriptions-2025-tech-and-non-tech-roles), 1,068 rows after cleaning. Worth being upfront about: this dataset is synthetically generated, not scraped from real postings. I say that here and I'll keep saying it anywhere I talk about how accurate the matching is.

This is my third pass at this notebook, and I'm keeping the changelog because I don't want to make the same mistakes twice. Round one: I had `master_skills_vocab` and `compute_skill_gap_clean` defined in the export cell, after the cell that already called them — straight `NameError`, moved the definitions earlier. Round two: my skill-gap function was computing a different match score than my main matching function, so the two disagreed on the same job — unified both onto one cosine-similarity number. Round three: scikit-learn's default tokenizer was tearing my skill names apart — `C#` became `c`, `.NET` became `net`, `CI/CD` split into two separate tokens — so I wrote a custom token pattern that keeps `#`, `+`, and `.` attached to the word around them.

Once the data's loaded, I split every raw skill string into a base skill plus a proficiency level — `"Python Advanced"` becomes `python` at level 3 — so TF-IDF isn't fed three unrelated variants of the same skill. Skills and keywords are semicolon-separated in this dataset, not JSON lists, so I parse those by hand. I de-dupe on `JobID`, not on the responsibilities text, because a lot of these postings are near-identical by design (synthetic data does that) and de-duping on text would've quietly deleted real rows.

I combine title, responsibilities, normalized skills, and keywords into one text field, fit a `TfidfVectorizer` (uni/bigrams, `min_df=2`, `max_features=5000`, my custom token pattern), and write two functions on top of it: one that ranks jobs by cosine similarity against a skill list and dedupes near-identical titles, and one that reports the missing skills for a given match, ranked by weight and filtered down to terms that are actually real skills rather than stray phrases like "fresher."

What I export to `/content/models/`: `tfidf_vectorizer.pkl`, `job_vectors.pkl`, `job_metadata.json`, and `master_skills_vocab.json`, which I reuse in `course.ipynb`.

Tools: pandas, scikit-learn, joblib, matplotlib, Kaggle API.

**Something I need to fix:** I have a live Kaggle API key hardcoded directly in this notebook (and the same one in `course.ipynb`). I already know this and I need to rotate it and move to `getpass`, which is the pattern I actually used correctly in Notebook 4.

---

## 4. Course Catalog Prep (`course.ipynb`)

Source: the [Online Courses dataset](https://www.kaggle.com/datasets/khaledatef1/online-courses) on Kaggle.

After downloading, I keep and rename the columns I actually need (`title`, `url`, `description`, `skills`, `duration`, `platform`, `language`, `category`, `sub_category`), clean out duplicates and missing rows, and normalize the text — lowercase, strip HTML and URLs, but keep the symbols programming skills actually use (`+ # . / , -`) instead of stripping them like a generic text cleaner would.

Then comes the part I spent the most time on: matching each course's raw skill strings against my `master_skills_vocab` from the TF-IDF notebook. Exact match first, then an alias dictionary I built by hand for the obvious equivalents (`"amazon web services"` → `"aws"`, `"structured query language"` → `"sql"`), then a fuzzy match through rapidfuzz at a threshold of 85. I added a safety check on top of the fuzzy match requiring at least one shared word token between the original skill and its match, because without that, something like "storyboarding" was getting fuzzy-matched to things it had nothing to do with, just on character overlap.

I drop any course that ends up with zero valid skills after all that, then build a skill → course index and export it.

What comes out (into `models/`): `course_catalog.pkl`, `skill_course_index.pkl`, `course_skill_vocab.json`, `course_catalog_clean.csv`.

Tools: pandas, NumPy, rapidfuzz, Kaggle API.

**Same fix needed here too** — same hardcoded Kaggle key as the notebook above. Rotating it once covers both.

---

## 5. Free Resource Enrichment (`04_youtube_gemini_enrichment.ipynb`)

This one's a one-time script, not something that runs live. I run it once, commit `free_resources.json` to the repo, and the backend just reads the static file from then on.

I actually did this one right on the credentials front — both the YouTube and Gemini keys go in through `getpass` prompts, never hardcoded. I take my top ~39 skills straight from the distribution I already computed in the NER notebook, and for each one I search YouTube for `"{skill} tutorial course for beginners"`, pull the top 10 candidates, and fetch view counts and duration in a second call since the search endpoint doesn't include those. Then I hand the candidate list to Gemini and ask it to pick the best one or two for an actual beginner — a real playlist or course from a channel that knows what it's doing, not a random high-view clickbait video. If Gemini's response doesn't parse cleanly, I fall back to just picking by view count instead of losing that skill entirely.

Output: `free_resources.json` — `{skill: [{video_id, title, channel, view_count, duration, url, curation_reason}, ...]}`.

Tools: `google-api-python-client` (YouTube Data API v3), `google-generativeai` (Gemini), `getpass`.

---

## 6. Everything I've exported, in one place

```
models/
├── skill_ner_sm/ or skill_ner_final/   ← my trained spaCy NER model
├── tfidf_vectorizer.pkl                ← fitted vectorizer
├── job_vectors.pkl                     ← job TF-IDF matrix
├── job_metadata.json                   ← job metadata
├── master_skills_vocab.json            ← shared vocabulary (feeds course.ipynb and Notebook 4)
├── course_catalog.pkl / .csv           ← cleaned course dataset
├── skill_course_index.pkl              ← skill → course lookup
├── course_skill_vocab.json             ← skills present in the course catalog
└── free_resources.json                 ← curated YouTube links per skill

prepared/ (Google Drive)
├── train_data.json / val_data.json     ← NER training/validation splits
├── labels.json                         ← ["SKILL"]
└── dataset_stats.json                  ← resume/entity statistics
```

## 7. Tools I used across the whole thing

| Category | Tools |
|---|---|
| Data handling | pandas, NumPy |
| NLP / NER | spaCy (blank pipeline + custom `ner` component), `Example`, `offsets_to_biluo_tags`, `minibatch`, `displacy` |
| Matching / ranking | scikit-learn (`TfidfVectorizer`, `cosine_similarity`, `train_test_split`) |
| Fuzzy matching | rapidfuzz |
| Persistence | pickle, joblib, JSON |
| Visualization | matplotlib |
| PDF parsing | PyMuPDF (`fitz`) |
| External data | Kaggle API, YouTube Data API v3, Google Generative AI (Gemini) |
| Runtime | Google Colab (Drive mount, file upload/download), tqdm
