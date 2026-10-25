# FemVita Web Application — Complete Functional & UI/UX Specification

---

## 1. Executive Summary & Brand Architecture

**FemVita** (*Fem* = Female/Feminine + *Vita* = Life) is an all-in-one web application designed to support women's holistic health, reproductive wellness, telehealth consultations, community interaction, and lifestyle management across all life stages.

* **Primary Color Palette:** FemVita Lavender (`#B19CD9`), Soft Lavender Highlight (`#EEDDFF`), Deep Charcoal Text (`#4F4F4F`), Pastel Flow Indicators (`#FF9AA2` / `#FFDAC1` / `#E2F0CB`).
* **Design Language:** Approachable Professionalism with soft-card UI, rounded corners (`12px–16px`), minimal line-art iconography, clear typography hierarchy, and a dual-column layout.

---

## 2. Global Navigation & Layout Architecture

The application maintains a consistent two-column responsive layout across all modules:

### A. Left Sidebar Navigation
* **App Branding:** FemVita Logo (`#B19CD9`) with decorative botanical icon.
* **Navigation Links:**
  1. `My Dashboard` (Icon: 4-square grid)
  2. `Cycle Tracker` (Icon: Refresh/Cycle arrows)
  3. `Wellness Hub` (Icon: Lotus flower)
  4. `Community` (Icon: People group)
  5. `Telehealth` (Icon: Stethoscope)
  6. `Profile` (Icon: User outline)

### B. Global Header & Quick Actions
* **URL Location Indicator:** `femvita.com`
* **Notification Bell Center (With Alert Badge):**
  * Period predictions (`Period predicted in 1 day`)
  * Ovulation windows (`Ovulation window opens in 3 days`)
  * Log reviews (`Log review available`)
* **Help & Support Icon:** `(?)`
* **Global User Menu / Avatar Dropdown**
* **Primary Call to Action (CTA):** `Log Today's Data` (Purple button in header)

### C. Universal Right-Hand Sticky Sidebar: "Health Log Today"
Present on all viewports, providing quick daily data logging capabilities:
* **Flow Intensity Selector:**
  * `Light` (Mint Green `#E2F0CB`)
  * `Medium` (Peach `#FFDAC1`)
  * `Heavy` (Pastel Red `#FF9AA2`)
* **Symptom Tracker Checkboxes:**
  * `Cramps` | `Fatigue` | `Acne`
  * `Headache` | `Mood Shifts`
* **Quantitative Biometrics Input:**
  * `BBT` (Basal Body Temperature) input field
  * `Cervical Mucus` status selection
  * `Hydration` level tracker

---

## 3. Module Breakdown & Screen Specifications

### Module 1: My Dashboard (`/dashboard`)
*Screen Overview: High-level snapshot of current health state, daily progress, and recommended actions.*

* **Hero Bar — Current Cycle Phase Indicator:**
  * Progress timeline showing `Day 14` of 28-day cycle.
  * Flower marker denoting predicted `Ovulation`.
  * Upcoming predictions panel:
    * `Next Period: 14 days`
    * `High Fertility Window: Day 12-16`
* **Cycle Insights Card:**
  * Wave chart visualizer mapping historical cycle patterns and hormonal fluctuations over time.
* **Personalized Wellness Card:**
  * Video Player Widget: *"15 min Follicular Phase Yoga"*
  * Recipe Widget: *"Phytoestrogen-Rich Salad"* (with read/cook action buttons).
* **My Goals Widgets:**
  * Circular progress meters:
    * Hydration Target: `75%`
    * Daily Steps: `8,200 / 10,000` steps
* **Community Corner Widget:**
  * Snippets of recent discussion threads (e.g., *"Managing PCOS naturally"*, *"First trimester tips"*).

---

### Module 2: Cycle Tracker (`/cycle-tracker`)
*Screen Overview: Comprehensive calendar view for period tracking, fertility windows, and long-term symptom logging.*

* **Top Summary Bar:**
  * Current Cycle: `Day 14`
  * Average Cycle Length: `29 days`
  * Average Period Length: `4 days`
* **Interactive Calendar (Monthly Grid View - e.g., November 2026):**
  * **Period Days:** Red/pink shaded dates (Days 2–5).
  * **High Fertility Window:** Soft orange shaded dates (Days 14–18).
  * **Predicted Ovulation Day:** Day 16 marked with specialized flower indicator.
  * **Daily Icon Overlay:** Displays user-logged symptoms, mood emojis (happy/sad/neutral), and flow icons on individual date squares.
* **Quick Insights Card:**
  * Basal Body Temperature (BBT) trend charts overlaying cycle days.
  * Quick metric summary for historical cycle regularity.

---

### Module 3: Wellness Hub (`/wellness-hub`)
*Screen Overview: Holistic health education, workout plans, nutrition guidelines, and sleep hygiene.*

* **Featured Article Banner:**
  * Topic: *"The Power of Sleep: A Deep Dive into Circadian Rhythm"* with a prominent `Read More` CTA.
* **Nutrition Corner:**
  * Recipe Cards (e.g., *"Hormone-Balancing Quinoa Salad"*) tailored to current cycle phase.
* **Fitness & Movement Section:**
  * Low-impact video modules (e.g., *"15-min Low-Impact Morning Routine"*).
* **Mindfulness & Meditation Sessions:**
  * `5-min Mindful Breath`
  * `10-min Body Scan`
  * `15-min Sleep Meditation`
* **Analytics Cards:**
  * **Weekly Sleep Summary:** Bar chart tracking hours slept over 7 days.
  * **Weekly Steps Goal:** Circular progress ring.
  * **Weekly Wellness Challenge:** Challenge tracker (e.g., *"Stay Hydrated — 1 of 10 days complete"*).
* **Knowledge Base Library:**
  * Links to articles on *"Cycle Syncing Your Diet"*, *"Understanding Cortisol"*, and *"Self-Care Rituals"*.

---

### Module 4: Community (`/community`)
*Screen Overview: A safe, supportive social network for peer discussions, support groups, and shared wellness challenges.*

* **Discussion Group Banners ("Find Your Tribe"):**
  * `Endo Warriors (Support)`
  * `New Moms Chat`
  * `Fitness Motivation`
* **Community Analytics & Collective Challenges:**
  * **Community Average Sleep:** Aggregate bar chart comparing user averages against community metrics.
  * **Group Challenge:** *"Collective Steps Goal — 1.6M Team Steps"*
* **Recipe Exchange Section:**
  * Shared community recipes (e.g., *"User123's Lemon Thyme Chicken Bowl"*).
* **Member Spotlights & Stories:**
  * User blogs and inspiring health journeys.
* **Poll of the Week Widget:**
  * Interactive poll: *"What's your preferred stress relief? (Yoga, Reading, Chatting)"*
* **Upcoming Member Events:**
  * Calendar listings for Virtual Book Clubs, Fertility Q&A sessions, and Healthy Cooking events.
* **Recent Member Posts Feed:**
  * Social feed displaying real-time community discussions with timestamp and comment count.

---

### Module 5: Telehealth & Consultations Hub (`/telehealth`)
*Screen Overview: Virtual healthcare portal connecting users with women's health specialists.*

* **Hero Banner:**
  * *"Virtual Care with Specialists — Schedule Consultations | Video & Chat Support | Meet Our Expert Team"*
* **Specialist Doctor Directory (Profiles):**
  * **Dr. Aris** (Gynecologist)
  * **Maya Patel** (Nutritionist)
  * **Dr. Kenji Tanaka** (PCP / General Practitioner)
* **Service Offerings Grid:**
  * `Gynecology`
  * `Nutritional Counseling`
  * `General Wellness`
  * `Mental Health Support`
* **Appointment Scheduling Calendar Widget:**
  * Interactive date picker with `Quick Book` option.
* **Your Appointments List:**
  * Upcoming booked consultations (e.g., *"Oct 22: Dr. Aris (Gyn.) - Video"*, *"Oct 24: Maya Patel (Nutri.) - Chat"*).
* **Secure Messaging Center:**
  * Direct doctor chat box with document upload links and lab result notifications.

---

### Module 6: Profile & Account Settings (`/profile`)
*Screen Overview: User profile overview, privacy controls, device connections, and medical history.*

* **User Identity Card:**
  * User Avatar / Profile Image
  * User Name: **Sarah Johnson**
  * Username: `s.j` | Email: `sarahjohnson@gmail.com`
  * Membership Status: *Member since 2023*
* **Personal Details & Security:**
  * Birthday, Account Type, Edit Profile trigger.
  * Security settings & MFA configuration.
* **Medical & Health Records Vault:**
  * Uploaded medical documents, lab results, and links to health summaries for doctor visits.
* **Notification Preferences:**
  * Toggle switches for `Cycle Alerts`, `Sleep Alerts`, and `Goal Alerts`.
* **Connected Devices Management:**
  * Smartwatch & fitness tracker synchronization status indicator (`Synced`).
* **Data & Privacy Controls (Regulatory Compliance):**
  * `Export Data` (Export full personal health records in PDF/CSV format).
  * `Delete Account` (Destructive action button for complete data wiping).
* **Activity & Personal Sleep Trends:**
  * Historical 7-day trend line charts for activity and sleep pattern monitoring.

---

## 4. Technical Architecture Requirements

```
[ Frontend: React / Next.js ] 
            │
            ├──> API Layer: Node.js / Python FastAPI
            │         │
            │         ├──> PostgreSQL (User accounts, logs, scheduling)
            │         ├──> Encrypted Health Records Storage (AES-256)
            │         └──> WebRTC Gateway (Telehealth Video/Chat)
            │
            └──> Design Tokens System (femvita-theme.css)
```

1. **Security Compliance:** HIPAA compliant storage for doctor consultation records, GDPR data portability (`Export Data`) and right-to-be-forgotten (`Delete Account`).
2. **End-to-End Encryption:** Applied to all daily flow logs, symptom notes, cervical mucus observations, and medical records.
3. **Data Portability:** Ability to render medical summaries formatted for clinical presentation.