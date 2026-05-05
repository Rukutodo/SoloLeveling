# Solo Leveling: Personal Development System

![System Status](https://img.shields.io/badge/System-Awakened-00d4ff?style=for-the-badge&logo=shadow)
![Hunter Rank](https://img.shields.io/badge/Hunter_Rank-S--Rank-7b2ff7?style=for-the-badge)

An all-in-one, responsive personal development application inspired by the **Solo Leveling** system. Track your evolution, manage your quests, and level up your life.

---

## Core Features

### Calorie Tracker (AI Vision)
- **AI-Powered Analysis**: Upload a photo of your meal and the system (powered by Gemini AI) will identify the food and estimate calories/macros.
- **3-Step Cascade**: Image Analysis ➔ Dish Identification ➔ Ingredient Breakdown.
- **Daily Logs**: Keep track of your nutritional intake across breakfast, lunch, dinner, and snacks.

### BMI Tracker
- **Status Analysis**: Track your weight and height evolution.
- **Visual Scale**: RPG-inspired gauges showing your current body composition category.
- **Trend Charts**: Beautifully rendered charts showing your progress over time.

### Workout Modes
- **Home Mode**: 15+ bodyweight exercises for hunters training in the field.
- **Gym Mode**: Equipment-based exercises for maximum power gain.
- **Detailed Guides**: Every exercise includes step-by-step instructions, muscle targeting, and hunter tips.

### Quest Calendar
- **Event Tracking**: Log your daily tasks, appointments, and "quests".
- **RPG UI**: Visual indicators for completed activities.

### Gold Reserve (Finance)
- **Financial Ledger**: Track your income and expenses.
- **Category Breakdown**: Dynamic bars showing exactly where your "gold" is being spent.

### Gamification Engine
- **XP System**: Earn experience points for every productive action.
- **Hunter Ranks**: Progress from E-Rank to S-Rank as you level up.
- **Player Stats**: Track your total XP and current Hunter Title.

---

## Technology Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas)
- **AI Engine**: [Google Gemini Pro Vision](https://ai.google.dev/)
- **Authentication**: [Auth.js (NextAuth v5)](https://authjs.dev/)
- **Styling**: Vanilla CSS (Solo Leveling Design System)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts**: [Recharts](https://recharts.org/)

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Gemini AI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rukutodo/SoloLeveling.git
   cd SoloLeveling
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   AUTH_SECRET=your_generated_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Run the System**
   ```bash
   npm run dev
   ```

---

## System Rules
1. Never miss a Daily Quest.
2. Every action counts toward your Level Up.
3. **Become the Strongest Version of Yourself.**

---

*Developed with the Solo Leveling System Interface.*
