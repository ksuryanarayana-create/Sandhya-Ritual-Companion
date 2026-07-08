# Product Requirements Document: Sandhya Companion

## Product overview
Sandhya Companion is a simple, mobile-friendly web app for daily Sandhya Vandanam and Gayatri practice. It is designed first for personal use, with the option to share later with family and friends. The core goal is to create a calm, distraction-free alternative to ad-heavy Hindu calendar apps, while keeping the first version intentionally small and easy to use.[cite:16][cite:25][cite:28]

## Problem
Many calendar and panchang apps are useful but can become hard to use because of intrusive ads, clutter, and too many features on the screen at once. This is especially frustrating for a prayer-related use case, where the experience should feel quiet, fast, and respectful rather than noisy and commercial.[cite:16][cite:25][cite:28]

## Users
The primary user is one person who is non-technical and wants a daily practice companion that works reliably on a phone. Secondary users may include family members or friends, so the interface should also be readable for older users, with large text, simple labels, and minimal navigation.

## Goal for version 1
The first version should help the user open the app and immediately see what matters for today. It should support the daily flow of morning, midday, and evening practice with clear timing context, completion tracking, and a small notes area. Beginner AI app-building workflows work best when the first release is narrow, testable, and based on a plan before extra features are added.[cite:17][cite:21][cite:23]

## Core features
- Location input by city or manual selection.
- Today screen showing date, location, sunrise, and sunset.
- Three practice sections: morning, madhyahna, and evening.
- Each section includes a checklist, completion toggle, and short notes field.
- Mobile-first layout with large text, high contrast, and zero ads.
- Local data storage so the user’s completion status and notes remain available on the same device.[cite:17][cite:21][cite:22]

## Out of scope for version 1
- Login or user accounts.
- Payments or subscriptions.
- Social features or public sharing.
- Complex full panchang calculations beyond the immediate daily need.
- Notifications, family sync, or cross-device sync.

## User story
As a user doing daily Sandhya Vandanam, the user wants to open the app and quickly see the day’s key timing context and the three practice windows, so the user can complete the practice without distraction or searching through clutter.

## Success criteria
The app is successful if it opens quickly on mobile, feels calm and readable, and makes the user prefer it over an ad-heavy alternative for daily use. A successful version 1 should also be simple enough to build with an AI app builder in one small project and easy enough to refine through short follow-up prompts, which is how beginner Replit workflows are commonly taught.[cite:17][cite:21][cite:22]

## Build prompt
Build a simple mobile-friendly web app for personal daily Sandhya Vandanam and Gayatri practice. The app should be clean, distraction-free, and have no ads. Show today’s date, location, sunrise, sunset, and three practice sections: morning, madhyahna, and evening. Each section should have a checklist, a short notes field, and a completed toggle. Keep the design calm, minimal, and readable for elders too, with large text and high contrast. Start with a plan first. Then build only version 1 with today screen, location input, and local data storage. Do not add login, payments, or social features yet.[cite:17][cite:21]
