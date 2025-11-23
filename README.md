# ZETA - Personal Work Assistant

ZETA is a futuristic, AI-powered personal work assistant designed to streamline your workflow. It integrates with Linear to manage issues, provides intelligent insights, and features a "Jarvis-like" interface.

## Features

- **🤖 AI Chat Assistant:** Interact with your work data using natural language.
- **🔗 Linear Integration:** View, create, and update Linear issues directly.
- **📊 Smart Analysis:** Get AI-driven insights on your tasks and priorities.
- **🎨 Futuristic UI:** A premium, dark-themed interface with glowing effects and animations.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase
- **AI:** OpenAI (GPT-4o-mini)
- **Icons:** Lucide React

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dhanushramasamy/Zeta.git
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file with the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
   LINEAR_API_KEY=your_linear_api_key
   OPENAI_API_KEY=your_openai_api_key
   LINEAR_WEBHOOK_SECRET=your_webhook_secret
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** to see ZETA in action.
