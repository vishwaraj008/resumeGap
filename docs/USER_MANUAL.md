# User Manual — SkillGap

SkillGap analyzes your resume against a target job role and shows how well you
match, which skills you're missing, and a step-by-step plan to close the gap.

This manual walks through the app from the user's point of view. To install and
start the app first, see **[INSTALLATION.md](INSTALLATION.md)**.

---

## Contents

- [What SkillGap does](#what-skillgap-does)
- [Getting started](#getting-started)
- [1. Create an account / log in](#1-create-an-account--log-in)
- [2. The dashboard](#2-the-dashboard)
- [3. Add your skills (resume)](#3-add-your-skills-resume)
- [4. Choose a target role](#4-choose-a-target-role)
- [5. Read your results](#5-read-your-results)
- [6. Learning roadmap](#6-learning-roadmap)
- [7. Download a PDF report](#7-download-a-pdf-report)
- [8. Compare multiple roles](#8-compare-multiple-roles)
- [9. History](#9-history)
- [10. Profile](#10-profile)
- [Understanding your match score](#understanding-your-match-score)
- [FAQ](#faq)

---

## What SkillGap does

Given a resume and a target job role, SkillGap gives you:

- an **importance-weighted compatibility score** (how ready you are for the role),
- a **matched vs. missing skills** breakdown,
- a sequenced **learning roadmap** with free and paid resources,
- a **career-trajectory** view, and
- a downloadable **PDF report**.

---

## Getting started

Open the app in your browser:

- **App:** <http://localhost:3000>

You'll land on the login screen the first time. After that, the app opens on your
**Dashboard**.

---

## 1. Create an account / log in

On the login screen:

1. To make a new account, click **Create one** to switch to **Sign Up** mode.
2. Enter your **email** (e.g. `you@example.com`) and a **password**.
3. Click **Create account**. You're logged in immediately.

To return later, use the same screen in **Log In** mode with your email and
password, then click **Continue**.

> Your session stays valid for 24 hours by default, then you'll be asked to log in
> again.

---

## 2. The dashboard

After logging in you see **"Welcome back"** and:

- **Start New Analysis** — the main button to begin.
- **Stat tiles** — how many resumes you've uploaded and analyses you've run.
- **Recent analyses** — quick links back into past results (full list under
  **History**).

Click **Start New Analysis** to begin.

---

## 3. Add your skills (resume)

On the **Start Your Analysis** screen, choose how to provide your skills:

- **Upload a PDF resume** — drag-and-drop your resume file, or click to browse.
  Only **PDF** files are accepted. SkillGap extracts your skills automatically
  using a trained model plus keyword matching.
- **Add skills manually** — type and select skills from the auto-complete list if
  you don't want to upload a file.

Once your skills are captured, continue to role selection.

> Tip: a clean, text-based PDF (not a scanned image) gives the best extraction.

---

## 4. Choose a target role

On the **Choose Role** screen, start typing a job title (e.g. `.NET Developer`,
`Data Analyst`). Pick from the auto-complete list of available roles, then run the
analysis. In a few seconds you're taken to your results.

---

## 5. Read your results

The **Results** page opens on the **Overview** tab:

- **Match score** — a single percentage showing how ready you are for the role
  (see [Understanding your match score](#understanding-your-match-score)).
- **Matched skills** — required skills you already have.
- **Missing skills** — required skills you don't yet have.
- **Skill importance bars** — each required skill shown with its importance (bar
  width) and whether you have it (color). This tells you *which* gaps matter most.

Switch tabs at the top to see the **Learning Roadmap**.

---

## 6. Learning roadmap

The **Learning Roadmap** tab turns your missing skills into an ordered plan:

- Skills are sequenced so **foundations come first** (prerequisites before
  advanced topics).
- Each skill lists **learning resources** and an **estimated study time**.
- Use the **resource filter** to show **All**, **Free**, or **Paid** resources.
- A **career-trajectory** view shows where this role sits relative to your current
  match level.

---

## 7. Download a PDF report

From the Results page, open the **report** action to generate a **PDF report** of
your analysis — match score, matched/missing skills, and roadmap — which you can
save or share.

---

## 8. Compare multiple roles

Use **Compare** to analyze the same resume against **2–3 roles side by side**. This
is useful when you're deciding between career directions — you can see at a glance
which role you're closest to and what each one would require.

---

## 9. History

The **History** page lists your past resumes and analyses. Click any entry to
reopen its results, so you can track progress over time as you learn new skills and
re-run the analysis.

---

## 10. Profile

The **Profile** page shows your account details.

---

## Understanding your match score

The percentage on the Results page is **not** a simple "matched ÷ required" ratio,
and it is **not** the raw similarity score used internally for ranking. It is an
**importance-weighted coverage** score:

- Every required skill carries a **weight** based on how rare/specialized it is.
  Specialized skills (e.g. `kubernetes`) count far more than generic ones
  (e.g. `team`).
- Your score is the share of that *weighted* importance you cover.

**What this means for you:**

- Missing one **minor** skill barely dents your score (you might still see ~93%).
- Missing a **high-importance** skill drops it much more.
- The **skill importance bars** show exactly which missing skills are worth
  learning first — focus your roadmap effort there.

---

## FAQ

**My resume upload was rejected.**
Only PDF files are accepted. If your file is a scanned image, the text may not be
extractable — use a text-based PDF, or add your skills manually.

**Some of my skills weren't detected.**
Extraction is automatic but not perfect. Use the **Add skills manually** option to
include anything that was missed before choosing a role.

**Can I analyze the same resume against several roles?**
Yes — use **Compare** for 2–3 roles at once, or run separate analyses and review
them under **History**.

**Do free learning resources exist, or only paid courses?**
Both. Use the resource filter on the roadmap to show **Free**, **Paid**, or
**All**.

**I was logged out.**
Sessions expire after 24 hours by default. Just log back in with your email and
password — your history is preserved.
