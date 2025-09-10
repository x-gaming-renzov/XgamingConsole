---
hide_title: true
---
# Registry design (objects/experiences)

Define your objects and experiences in a JSON file (e.g., `nova-objects.json`). This file powers default configs and improves DX.

Large example

```json
{
	"objects": {
		"ui-theme": {
			"type": "ui",
			"keys": {
				"text_color": {
					"type": "string",
					"description": "Primary text color",
					"default": "#222"
				},
				"accent_color": {
					"type": "string",
					"description": "Accent color",
					"default": "#ff6b6b"
				},
				"card_radius": {
					"type": "number",
					"description": "Card border radius",
					"default": 16
				}
			}
		},
		"ftue-landing": {
			"type": "content",
			"keys": {
				"game_title": {
					"type": "string",
					"description": "Landing title",
					"default": "Nova Legends"
				},
				"tagline": {
					"type": "string",
					"description": "Landing tagline",
					"default": "Join the battle"
				},
				"username_placeholder": {
					"type": "string",
					"description": "Input placeholder",
					"default": "Your hero name"
				},
				"cta_button": {
					"type": "string",
					"description": "CTA label",
					"default": "Play Now"
				}
			}
		}
	},
	"experiences": {
		"landing": {
			"description": "Landing screen",
			"objects": { "ftue-landing": true, "ui-theme": true }
		},
		"theme": { "description": "Global theme", "objects": { "ui-theme": true } }
	}
}
```
