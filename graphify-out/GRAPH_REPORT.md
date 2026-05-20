# Graph Report - SoloLeveling  (2026-05-20)

## Corpus Check
- 97 files · ~46,752 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 528 nodes · 696 edges · 80 communities (37 shown, 43 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cee0059f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Core API Routes & Models|Core API Routes & Models]]
- [[_COMMUNITY_Architectural Mapping & Features|Architectural Mapping & Features]]
- [[_COMMUNITY_Authentication & User Management|Authentication & User Management]]
- [[_COMMUNITY_Quests & Physical Metrics|Quests & Physical Metrics]]
- [[_COMMUNITY_Mongoose Models & Schemas|Mongoose Models & Schemas]]
- [[_COMMUNITY_AI Logging & Gmail Integration|AI Logging & Gmail Integration]]
- [[_COMMUNITY_Frontend Pages & UI Components|Frontend Pages & UI Components]]
- [[_COMMUNITY_Project Metadata & Tech Stack|Project Metadata & Tech Stack]]
- [[_COMMUNITY_Theming & Styling System|Theming & Styling System]]
- [[_COMMUNITY_Notes Management|Notes Management]]
- [[_COMMUNITY_Auth Configuration & Monitoring|Auth Configuration & Monitoring]]
- [[_COMMUNITY_Sidebar & Navigation UI|Sidebar & Navigation UI]]
- [[_COMMUNITY_Admin Logs Dashboard|Admin Logs Dashboard]]
- [[_COMMUNITY_Investment Management|Investment Management]]
- [[_COMMUNITY_Birthday Tracking|Birthday Tracking]]
- [[_COMMUNITY_Calorie Tracker & Date Selection|Calorie Tracker & Date Selection]]
- [[_COMMUNITY_Notes API Endpoints|Notes API Endpoints]]
- [[_COMMUNITY_Middleware & Auth Guards|Middleware & Auth Guards]]
- [[_COMMUNITY_Logbook & Daily Logs|Logbook & Daily Logs]]
- [[_COMMUNITY_Root Layout & Session|Root Layout & Session]]
- [[_COMMUNITY_Todo Management API|Todo Management API]]
- [[_COMMUNITY_Financial Statements & Records|Financial Statements & Records]]
- [[_COMMUNITY_Workout Management UI|Workout Management UI]]
- [[_COMMUNITY_Insurance Management API|Insurance Management API]]
- [[_COMMUNITY_Finance Dashboard UI|Finance Dashboard UI]]
- [[_COMMUNITY_Calendar Dashboard UI|Calendar Dashboard UI]]
- [[_COMMUNITY_User Dashboard UI|User Dashboard UI]]
- [[_COMMUNITY_AI & GenAI Integrations|AI & GenAI Integrations]]
- [[_COMMUNITY_Logbook Data Flow|Logbook Data Flow]]
- [[_COMMUNITY_Shared Library Utilities|Shared Library Utilities]]
- [[_COMMUNITY_AI Advisor API|AI Advisor API]]
- [[_COMMUNITY_Sleep Analysis AI|Sleep Analysis AI]]
- [[_COMMUNITY_Calorie Analysis AI|Calorie Analysis AI]]
- [[_COMMUNITY_BMI Tracker UI|BMI Tracker UI]]
- [[_COMMUNITY_Logbook UI|Logbook UI]]
- [[_COMMUNITY_Todo List UI|Todo List UI]]
- [[_COMMUNITY_Notes List UI|Notes List UI]]
- [[_COMMUNITY_Core Systems (BMICaloriesXP)|Core Systems (BMI/Calories/XP)]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]

## God Nodes (most connected - your core abstractions)
1. `dbConnect()` - 70 edges
2. `awardXP()` - 17 edges
3. `User` - 15 edges
4. `sendSystemMessage()` - 10 edges
5. `useNotifications()` - 7 edges
6. `Core Features` - 7 edges
7. `XP_REWARDS` - 6 edges
8. `getUserStats()` - 6 edges
9. `Project Status: S-Rank Design & Social Overhaul (May 2026)` - 6 edges
10. `useTheme()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `dbConnect()`  [EXTRACTED]
  app/api/bmi/route.ts → lib/mongodb.ts
- `GET()` --calls--> `dbConnect()`  [EXTRACTED]
  app/api/cron/birthday-reminder/route.ts → lib/mongodb.ts
- `GET()` --calls--> `dbConnect()`  [EXTRACTED]
  app/api/dashboard/route.ts → lib/mongodb.ts
- `GET()` --calls--> `dbConnect()`  [EXTRACTED]
  app/api/friends/route.ts → lib/mongodb.ts
- `GET()` --calls--> `dbConnect()`  [EXTRACTED]
  app/api/quests/chain/route.ts → lib/mongodb.ts

## Hyperedges (group relationships)
- **Authentication Infrastructure** — auth_config, auth_handlers, auth_middleware, nextauth_api [EXTRACTED 0.95]
- **AI Analysis Suite** — ai_advisor_api, sleep_analysis_api, calorie_analysis_api, gemini_integration [INFERRED 0.90]
- **System Health & Monitoring** — system_monitor_ui, logs_api, system_monitoring_architecture [EXTRACTED 0.90]
- **User Data Models** — birthday_birthdayschema, bodymetric_bodymetric, calendarevent_calendarevent, dailylog_dailylog, emi_emi, foodentry_foodentry, insurance_insurance, investment_investment, mainquest_mainquest, note_note, sleep_sleep, steps_steps, todo_todo, transaction_transaction, workoutlog_workoutlog [INFERRED 0.95]

## Communities (80 total, 43 thin omitted)

### Community 0 - "Core API Routes & Models"
Cohesion: 0.05
Nodes (58): GET(), DELETE(), GET(), POST(), DELETE(), GET(), PATCH(), POST() (+50 more)

### Community 1 - "Architectural Mapping & Features"
Cohesion: 0.05
Nodes (48): Endpoint, Endpoint, Endpoint, Endpoint, Endpoint, Endpoint, Endpoint, Endpoint (+40 more)

### Community 2 - "Authentication & User Management"
Cohesion: 0.08
Nodes (31): calculateBMI(), GET(), POST(), GET(), DELETE(), GET(), POST(), POST() (+23 more)

### Community 3 - "Quests & Physical Metrics"
Cohesion: 0.07
Nodes (19): GET(), POST(), GET(), BodyMetricSchema, IBodyMetric, FoodEntrySchema, IFoodEntry, IInvestment (+11 more)

### Community 4 - "Mongoose Models & Schemas"
Cohesion: 0.12
Nodes (16): genAI, GmailMessage, POST, checkAiRateLimit(), RouteHandler, RouteType, withLogger(), writeLog() (+8 more)

### Community 5 - "AI Logging & Gmail Integration"
Cohesion: 0.11
Nodes (17): BMI Tracker, Calorie Tracker (AI Vision), code:bash (git clone https://github.com/Rukutodo/SoloLeveling.git), code:bash (npm install), code:env (MONGODB_URI=your_mongodb_connection_string), code:bash (npm run dev), Core Features, Gamification Engine (+9 more)

### Community 6 - "Frontend Pages & UI Components"
Cohesion: 0.11
Nodes (18): BirthdaySchema, BodyMetric, CalendarEvent, DailyLog, EMI, FoodEntry, Insurance, Investment (+10 more)

### Community 7 - "Project Metadata & Tech Stack"
Cohesion: 0.16
Nodes (9): useNotifications(), branding, iconSets, navConfig, sectionLabels, Sidebar(), SidebarProps, TopHeader() (+1 more)

### Community 8 - "Theming & Styling System"
Cohesion: 0.15
Nodes (14): BMIPage, CalendarPage, CaloriesPage, DashboardPage, FinancePage, LogbookPage, NotesPage, QuestChainPage (+6 more)

### Community 9 - "Notes Management"
Cohesion: 0.17
Nodes (12): Feature, Feature, Feature, Feature, Feature, Feature, Project, Technology (+4 more)

### Community 10 - "Auth Configuration & Monitoring"
Cohesion: 0.2
Nodes (6): metadata, NotificationContext, NotificationContextType, NotificationProvider(), ThemeProvider(), ToastProvider()

### Community 11 - "Sidebar & Navigation UI"
Cohesion: 0.29
Nodes (8): ThemeContext, ThemeContextType, ThemeInfo, ThemeName, THEMES, useTheme(), ThemeSwitcher(), ThemeSwitcherProps

### Community 12 - "Admin Logs Dashboard"
Cohesion: 0.17
Nodes (3): genAI, genAI, genAI

### Community 13 - "Investment Management"
Cohesion: 0.25
Nodes (7): activityIconMap, DashboardData, DashboardPage(), pageVariants, sectionVariants, useCountUp(), UserStats

### Community 14 - "Birthday Tracking"
Cohesion: 0.28
Nodes (7): Toast, toastConfig, ToastContext, ToastContextType, ToastType, useToast(), HunterNetwork()

### Community 15 - "Calorie Tracker & Date Selection"
Cohesion: 0.22
Nodes (9): NextAuth Configuration, NextAuth Handlers, Auth Middleware, Credentials Provider, Google One Tap Provider, Logs Aggregation API, NextAuth API Route, System Monitor UI (+1 more)

### Community 16 - "Notes API Endpoints"
Cohesion: 0.25
Nodes (4): LogEntry, STATUS_COLORS, Summary, TYPE_COLORS

### Community 17 - "Middleware & Auth Guards"
Cohesion: 0.25
Nodes (8): Endpoint, Endpoint, Endpoint, Endpoint, Endpoint, File, File, Model

### Community 18 - "Logbook & Daily Logs"
Cohesion: 0.29
Nodes (3): Analysis, FoodEntry, DarkDatePickerProps

### Community 19 - "Root Layout & Session"
Cohesion: 0.29
Nodes (6): 1. Design System v2.1 (OKLCH Migration), 2. Social Consolidation: Hunter Network & Shadow Inbox, 3. Mobile Responsiveness Overhaul, 4. AI Functionality Restoration, 5. Technical Stabilization, Project Status: S-Rank Design & Social Overhaul (May 2026)

### Community 20 - "Todo Management API"
Cohesion: 0.29
Nodes (7): Endpoint, Endpoint, Endpoint, Endpoint, File, File, Model

### Community 22 - "Workout Management UI"
Cohesion: 0.33
Nodes (3): CATEGORIES, COLORS, Transaction

### Community 23 - "Insurance Management API"
Cohesion: 0.33
Nodes (6): Endpoint, Endpoint, Endpoint, Endpoint, File, Model

### Community 24 - "Finance Dashboard UI"
Cohesion: 0.53
Nodes (6): Account, Document, Document, Document, Organization, Person

### Community 25 - "Calendar Dashboard UI"
Cohesion: 0.4
Nodes (3): Exercise, WorkoutExercise, WorkoutLog

### Community 26 - "User Dashboard UI"
Cohesion: 0.4
Nodes (3): GET(), BirthdaySchema, IBirthday

### Community 27 - "AI & GenAI Integrations"
Cohesion: 0.4
Nodes (5): Endpoint, Endpoint, Endpoint, File, Model

### Community 29 - "Shared Library Utilities"
Cohesion: 0.67
Nodes (4): AI Advisor API, Calorie Analysis API (AI), Gemini AI Integration, Sleep Analysis API

### Community 30 - "AI Advisor API"
Cohesion: 0.5
Nodes (4): Endpoint, Endpoint, File, Model

### Community 31 - "Sleep Analysis AI"
Cohesion: 0.5
Nodes (4): apiLogger, ApiLog, mongodb, xpSystem

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (3): BMI & Weight API, Calorie Tracking API, XP Progression System

## Knowledge Gaps
- **172 isolated node(s):** `{ handlers, signIn, signOut, auth }`, `eslintConfig`, `config`, `nextConfig`, `metadata` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dbConnect()` connect `Core API Routes & Models` to `Logbook UI`, `Quests & Physical Metrics`, `Authentication & User Management`, `Mongoose Models & Schemas`, `User Dashboard UI`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `awardXP()` connect `Authentication & User Management` to `Core API Routes & Models`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `User` (e.g. with `BodyMetric` and `CalendarEvent`) actually correct?**
  _`User` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ handlers, signIn, signOut, auth }`, `eslintConfig`, `config` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core API Routes & Models` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Architectural Mapping & Features` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Authentication & User Management` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._