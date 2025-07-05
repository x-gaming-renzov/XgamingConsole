import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ExperienceAnalysis {
  name: string;
  type: "onboarding" | "tutorial" | "rewards" | "ui" | "level";
  description: string;
  suggestedObjects: string[];
  targetAudience: {
    segments: string[];
    description: string;
  };
  campaign: {
    name: string;
    utmSource: string;
  };
  variants: {
    control: {
      name: string;
      description: string;
    };
    treatment: {
      name: string;
      description: string;
    };
  };
}

export async function analyzeExperienceDescription(description: string): Promise<ExperienceAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert in mobile game A/B testing and FTUE (First Time User Experience) optimization. 
          
          Analyze the user's experiment description and extract structured information for creating an A/B test experiment in a mobile game.
          
          Available experiment types:
          - onboarding: Changes to user registration/signup flow
          - tutorial: Modifications to game tutorials or learning flows  
          - rewards: Adjustments to reward systems, currencies, bonuses
          - ui: User interface changes, layout modifications
          - level: Level design changes, difficulty adjustments
          
          Available objects to personalize (choose relevant ones):
          - Level 5 Tutorial: Tutorial content and progression
          - Welcome Popup: First-time user welcome messages
          - Onboarding Flow: User registration and setup process
          - Reward System: In-game rewards and bonuses
          - UI Elements: Interface components and layouts
          - Currency System: Coins, gems, and other currencies
          - Achievement System: Badges and accomplishments
          - Social Features: Friend connections and sharing
          - Push Notifications: Alert messages and timing
          - In-App Purchase: Store and payment flows
          
          Common user segments:
          - New Users (first 7 days)
          - TikTok Users (from TikTok campaigns)
          - iOS Users
          - Android Users
          - High Spenders
          - Retention Risk Users
          - Level 1-10 Players
          - Level 11-25 Players
          - Active Daily Players
          
          Return valid JSON only.`
        },
        {
          role: "user",
          content: `Analyze this experiment idea: "${description}"`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and format the response
    return {
      name: result.name || "New Experience",
      type: result.type || "rewards",
      description: result.description || description,
      suggestedObjects: result.suggestedObjects || [],
      targetAudience: {
        segments: result.targetAudience?.segments || ["New Users"],
        description: result.targetAudience?.description || "All users"
      },
      campaign: {
        name: result.campaign?.name || "Generated Campaign",
        utmSource: result.campaign?.utmSource || "experiment"
      },
      variants: {
        control: {
          name: result.variants?.control?.name || "Control",
          description: result.variants?.control?.description || "Current experience"
        },
        treatment: {
          name: result.variants?.treatment?.name || "Treatment", 
          description: result.variants?.treatment?.description || "Modified experience"
        }
      }
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    
    // Fallback response if OpenAI fails
    return {
      name: "New Experience",
      type: "rewards",
      description: description,
      suggestedObjects: ["Reward System"],
      targetAudience: {
        segments: ["New Users"],
        description: "All users"
      },
      campaign: {
        name: "Generated Campaign",
        utmSource: "experiment"
      },
      variants: {
        control: {
          name: "Control",
          description: "Current experience"
        },
        treatment: {
          name: "Treatment",
          description: "Modified experience"
        }
      }
    };
  }
}