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
  objectVariants?: {
    [objectName: string]: {
      control: Record<string, any>;
      treatment: Record<string, any>;
    };
  };
}

export async function analyzeExperienceDescription(
  description: string, 
  objects: any[] = [], 
  segments: any[] = []
): Promise<ExperienceAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert in mobile game A/B testing and FTUE (First Time User Experience) optimization. 
          
          Analyze the user's experiment description and extract structured information for creating an A/B test experiment in a mobile game.
          
          Please provide the output in the following exact JSON structure:
          {
            "name": "string",
            "type": "onboarding" | "tutorial" | "rewards" | "ui" | "level",
            "description": "string",
            "suggestedObjects": ["string"],
            "targetAudience": {
              "segments": ["string"],
              "description": "string"
            },
            "campaign": {
              "name": "string",
              "utmSource": "string"
            },
            "variants": {
              "control": {
                "name": "string",
                "description": "string"
              },
              "treatment": {
                "name": "string", 
                "description": "string"
              }
            },
            "objectVariants": {
              "objectName": {
                "control": {
                  "flagKey": "value"
                },
                "treatment": {
                  "flagKey": "differentValue"
                }
              }
            }
          }
          
          Available experiment types:
          - onboarding: Changes to user registration/signup flow
          - tutorial: Modifications to game tutorials or learning flows  
          - rewards: Adjustments to reward systems, currencies, bonuses
          - ui: User interface changes, layout modifications
          - level: Level design changes, difficulty adjustments
          
          Available objects to personalize (these are the exact object names from the database):
          ${objects.map(obj => `- "${obj.name}": ${obj.description || obj.type || 'Game object'}${obj.flags ? '\n    Flags: ' + obj.flags.map((f: any) => `${f.key} (${f.type}, default: ${f.defaultValue})`).join(', ') : ''}`).join('\n          ')}
          
          IMPORTANT: 
          - Use the exact object names in quotes as they appear above for the suggestedObjects array.
          - Suggest ALL relevant objects needed for the experiment, not just one. For example:
            * For coin/reward experiments: include both "Currency System" AND the relevant level/popup objects
            * For level-based experiments: include both the level object AND any reward/UI objects affected
            * For onboarding experiments: include tutorial objects AND any UI/reward objects shown
          - For each suggested object, provide specific flag values in the objectVariants section based on the experiment description.
          - Think comprehensively about what objects need to work together to create the complete experience.
          
          Available user segments (these are the exact segment names from the database):
          ${segments.map(seg => `- "${seg.name}"`).join('\n          ')}
          
          If no segments match, you can suggest these common mobile game segments:
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
          content: `Analyze this experiment idea: "${description}"

Examples of comprehensive object selection:
- "Double coins for level 5 players" → Select: ["Level 5 Tutorial", "Currency System"] 
- "Welcome popup for new users" → Select: ["Welcome Popup", "Onboarding Flow"]
- "Tutorial skip for TikTok users" → Select: ["Level 5 Tutorial", "Onboarding Flow"]

Make sure to select ALL objects that need to work together for this experiment.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Log the raw OpenAI response for debugging
    console.log("OpenAI Raw Response:", JSON.stringify(result, null, 2));
    
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
      },
      objectVariants: result.objectVariants || {}
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