### **1. Organization**
**Purpose:** The highest level container for all data related to a client. Manages global settings and billing.

**Attributes:**

- `organization_id` (Primary Key, UUID)
- `name` (String)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `plan_details` (JSONB)q
- `credits_remaining` (Integer)
- `billing_email` (String)
    

**Relationships:**

- Has Many `Projects`
- Has Many `Members` (via `OrganizationMember` join table)
- Has Many `BillingTransactions`
    

**Permissions Managed At This Level:**

- Adding/Removing `Admins` from the Organization.
- Billing management.
- Creation/Deletion of `Projects`.
    
---

### **2. Project**

**Purpose:** A logical grouping for experiments, campaigns, and user data related to a specific product or application.

**Attributes:**

- `project_id` (Primary Key, UUID)
- `organization_id` (Foreign Key, links to `Organization`)
- `name` (String)
- `description` (Text, optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `sdk_api_key` (String, unique token for SDK integration)
    

**Relationships:**

- Belongs To `Organization`
- Has Many `Campaigns`
- Has Many `Experiences`
- Has Many `Objects`
- Has Many `Segments`
- Has Many `Members` (via `ProjectMember` join table)
- Has Many `KnowledgeBaseDocuments`
- Has Many `ProjectIntegrations`
    

**Permissions Managed At This Level:**

- Project-specific member roles and access.
- CRUD operations for `Campaigns`, `Experiences`, `Objects`, `Segments`.
- Access to integrations (Slack, API Keys for SDK).
    

---

### **3. Member (User)** 
**Purpose:** Represents an individual user account within the system.

**Attributes:**

- `member_id` (Primary Key, UUID)
- `email` (String, Unique)
- `username` (String, Unique, optional)
- `password_hash` (String)
- `first_name` (String)
- `last_name` (String)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `photo_url` (String, optional)
- `last_login_at` (Timestamp, optional)
    

**Relationships:**

- Has Many `OrganizationMember` entries (for organization-level roles)
- Has Many `ProjectMember` entries (for project-level roles)
    

---

### **4. OrganizationMember (Join Table for Org-Level Roles)**

**Purpose:** Defines a member's role within an Organization.

**Attributes:**

- `organization_id` (Foreign Key)
- `member_id` (Foreign Key)
- `role` (Enum: `Owner`, `Admin`, `Member`)
- `created_at` (Timestamp)
    

---

### **5. ProjectMember (Join Table for Project-Level Roles)**

**Purpose:** Defines a member's role within a specific Project.

**Attributes:**

- `project_id` (Foreign Key)
- `member_id` (Foreign Key)
- `role` (Enum: `Admin`, `Developer`, `Executive`, `Analyst`)
- `created_at` (Timestamp)
    

---

### **6. Segment**

**Purpose:** Defines a dynamic group of users based on specified rules and attributes.

**Attributes:**

- `segment_id` (Primary Key, UUID)
- `project_id` (Foreign Key, links to `Project`)
- `name` (String)
- `description` (Text, optional)
- `rules` (JSONB/Text: Stores the complex rule logic)
- `metrics` (JSONB e.g. [{`name` : `daily_active_users` , `type` : `number`, `value`:`2300`},...])
- `last_calculated_at` (Timestamp)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `used_in_experiences` (Array of Strings/IDs: To quickly show where it's used) //TODO : decide if I should create a many to many relationship/junction table here (experiences <-> segments)
- `outcomes` (JSONB/ JSON array)  //what is this though? I added this for the past outcomes section
- `chartdata` (JSONB)

**Relationships:**

- Belongs To `Project`
- Can be associated with Many `Experiences`

**Gaps**
Editing segment rules is not feasible at all, It makes keeping track of users difficult. The dashboard is not responsible for that, but still need to write this somewhere.
When a segment is created/edited/deleted, any api call to the engine required?
    
---

### **7. Campaign**

**Purpose:** Groups related experiences, often tied to marketing acquisition channels. Provides an overview of performance across these experiences.

**Attributes:**

- `campaign_id` (Primary Key, UUID)
- `project_id` (Foreign Key, links to `Project`)
- `name` (String, e.g., "Q1 Acquisition Push")
- `utm_source` (String, e.g., "facebook", "google_uac_test", "tiktok_creative") - _New: Explicitly from Create Campaign UI._ //Why is UTM source automatiaclly taken from username? Why is a campaign associated with single utm source?
- `label` (String, optional, e.g., "Q1 Acquisition Campaign") - _New: User-defined label._
- `status` (String)
- `description` (Text, optional)
- `launch_date` (Timestamp) - _New: From Create New Campaign UI._
- `end_date` (Timestamp, optional)
- `total_users` (Integer)
- `campaign_data` (JSONB) (Est Revenue, Avg D0 Retention, Objects Bound Count as [{metric: "est_revenue", value: 100, type: "currency", unit: "USD"}, {metric: "avg_d0_retention", value: 35, type: "percentage"}, {metric: "objects_bound_count", value: 3, type: "number"}])
- `user_count` (JSONB) (Users affected each day as [{date: "2025-01-01", count: 100},...])
- `flag_bundle` (String, e.g., "facebook_v2.1") - //How even will we get this?
- `experience_ids` (Array of Foreign Keys, links to `Experience`)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**

- Belongs To `Project`
- Has Many `Experiences`
- Has Many `CampaignHistoryEntries`
    
---

### **8. CampaignHistoryEntry**

**Purpose:** Tracks significant lifecycle events and changes to a `Campaign`.

**Attributes:**

- `history_entry_id` (Primary Key, UUID)
- `campaign_id` (Foreign Key, links to `Campaign`)
- `event_description` (Text, e.g., "Campaign created", "Split changed: VIP Tutorial 25 -> 50%")
- `event_timestamp` (Timestamp with timezone)
- `performed_by_member_id` (Foreign Key, links to `Member`, optional, can be "System")
- `old_campaign` (JSONB)
- `new_campaign` (JSONB)

**Relationships:**

- Belongs To `Campaign`
- Associated with `Member` who performed the action.
    

---

### **9. Experience**

**Purpose:** Defines a specific experiment or A/B test, including its variations, target audience, and associated objects. This is the central entity for running the experiment.

**Attributes:**

- `experience_id` (Primary Key, UUID)
- `project_id` (Foreign Key, links to `Project`)
- `campaign_id` (Foreign Key, links to `Campaign`)
- `name` (String, e.g., "Enhanced Onboarding Experience")
- `description` (Text, optional)
- `status` (String)
- `traffic_split_percentage` (Integer: Total percentage of the selected audience exposed to the experience)
- `created_at` (Timestamp)
- `created_by_member_id` (Foreign Key, links to `Member`)
- `updated_at` (Timestamp)
- `metrics` (JSONB) (Participants, D1 Retention, Activation as [{metric: "participants", value: 100, type: "number"}, {metric: "d1_retention", value: 35, type: "percentage"}, {metric: "activation", value: 10, type: "percentage"}])  - _Calculated from performance data._
- `segment_ids` (Array of Strings: Of Experiecne segments)
- `object_ids` (Array of Strings: Of Experiecne objects)
    

**Relationships:**

- Belongs To `Project`
- Belongs To `Campaign` (optional)
- Has Many `ExperienceSegments`
- Has Many `ExperienceObjectConfigs`
- Has Many `ExperienceHistoryEntries`

---

### **10. ExperienceSegment**

**Purpose:** Defines the specific segments targeted by an `Experience` and the percentage of users from that segment that will participate. An experience can target multiple segments.

**Attributes:**

- `experience_id` (Foreign Key)
- `segment_id` (Foreign Key, links to `Segment`)
- `experience_percentage` (Integer: What percentage of _this specific segment_ gets this experience.)
- `estimated_users` (Integer)
    

**Relationships:**

- Belongs To `Experience`
- Associated with `Segment`
    
---

### **11. ExperienceVariant**

**Purpose:** Represents a specific "variation" or "treatment" within an `Experience`. Each `Experience` can have multiple `ExperienceVariant` entries, including a "Control" and one or more "Treatment" groups.

**Attributes:**

- `experience_variant_id` (Primary Key, UUID)
- `experience_id` (Foreign Key, links to `Experience`)
- `name` (String, e.g., "Control", "Treatment", "New Variant")
- `type` (Enum: `Control`, `Treatment`)
- `split_percentage_within_experience` (Integer: How traffic is split _among the variants_ within the experience)
- `users` (Integer)
- `d1_retention` (Float)
- `uplift` (Float)
- `p_value` (Float)
- `created_at` (Timestamp)
- `updated_at` (Timestamp) 

    

**Relationships:**

- Belongs To `Experience`
- Has Many `ExperienceVariantObjectConfigs`
    

---

### **12. ExperienceVariantObjectConfig**

**Purpose:** Links an `ExperienceVariant` to the specific `Objects` it overrides and the values it sets for those objects. This is where the feature flag payload for a variant is stored.

**Attributes:**

- `experience_variant_id` (Foreign Key) //an object can have multiple variants. Need to fix this.
- `object_id` (Foreign Key)
- `configured_value` (JSONB/Text: The specific value for the object for _this variant_ in _this experience_.)
- `created_at` (Timestamp)
    

**Relationships:**

- Belongs To `ExperienceVariant`
- Belongs To `Object`
    

---

### **13. ExperienceHistoryEntry**

**Purpose:** Records significant lifecycle events of an `Experience` (creation, launch, pause, archive).

**Attributes:**

- `history_entry_id` (Primary Key, UUID)
- `experience_id` (Foreign Key, links to `Experience`)
- `event_type` (Enum: `Created`, `Launched`, `Paused`, `Archived`, `Edited`, `Resumed`, `Split_Adjusted`) - _Added `Split_Adjusted`._
- `event_description` (Text, e.g., "Experience created (active) by System")
- `event_timestamp` (Timestamp)
- `performed_by_member_id` (Foreign Key, links to `Member`, optional, can be "System")
- `details` (JSONB, optional: e.g., old and new split percentages)
    

**Relationships:**

- Belongs To `Experience`
- Associated with `Member` who performed the action.
    

---

### **14. Object (Feature Flags)**

**Purpose:** Represents a configurable feature flag, game parameter, or UI element.

**Attributes:**

- `object_id` (Primary Key, UUID)
- `project_id` (Foreign Key, links to `Project`)
- `name` (String)
- `key` (String, Unique within project, used in SDK)
- `type` String
- `description` (Text, optional)
- `variants` (JSONB) (Array of Objects | ) 
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

**Relationships:**

- Belongs To `Project`
- Has Many `ObjectHistoryEntries`   
- Has Many `ObjectVariants`
- Can be used by Many `ExperienceVariantObjectConfigs`

**Gaps**
Object creation is dependent on a manifest. This is vague.

---

### **15. ObjectVariant**

**Purpose:** Defines the _base_ different configurations or states an Object can take, independent of any experience. These are the pre-defined options from which experiences can select or derive.

**Attributes:**

- `object_variant_id` (Primary Key, UUID)
- `object_id` (Foreign Key, links to `Object`)
- `name` (String)
- `type` String
- `value` (JSONB | This holds the default value for the object)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
    

**Relationships:**

- Belongs To `Object`
- Can be referenced by `ExperienceVariantObjectConfigs`
    
---

### **16. ObjectHistoryEntry**

**Purpose:** Tracks changes to an Object's definition or default values, linking to a manifest version.

**Attributes:**

- `history_id` (Primary Key, UUID)
- `object_id` (Foreign Key, links to `Object`)
- `change_description` (Text)
- `old_object` (JSONB)
- `new_object` (JSONB)
- `changed_by_member_id` (Foreign Key, links to `Member`, optional)
- `change_timestamp` (Timestamp)

**Relationships:**

- Belongs To `Object`
- Associated with `Member` who made the change.

---

### **17. KnowledgeBaseDocument**

**Purpose:** Stores documents uploaded for LLM training/suggestions.

**Attributes:**

- `document_id` (Primary Key, UUID)
- `project_id` (Foreign Key, links to `Project`)
- `file_name` (String)
- `file_path` (String, URL/path to stored file)
- `tokens` (Integer)
- `status` (String)
- `category` (String)
- `uploaded_by_member_id` (Foreign Key, links to `Member`)
- `uploaded_at` (Timestamp)
    

**Relationships:**

- Belongs To `Project`
- Uploaded by `Member`

---

### **18. ProjectIntegration**

**Purpose:** Manages connections to external services for a specific project. (like slack,  Whatsapp, etc)

**Attributes:**

- `integration_id` (Primary Key, UUID)
- `project_id` (Foreign Key, links to `Project`)
- `type` (Enum: `Slack`, `Webhook`, `Custom_API`)
- `status` (Enum: `Connected`, `Disconnected`, `Pending`)
- `info` (JSONB: Stores integration-specific details)
- `creds` (JSONB: Stores access-specific details)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
    

**Relationships:**

- Belongs To `Project`

### **19. Plans**

**Purpose:** Manages different plans and their associated features and pricing.

**Attributes:**

- `plan_id` (Primary Key, UUID)
- `name` (String)
- `price` (Decimal)
- `credits_included` (Integer)
- `billing_interval` (String)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `features` (JSONB)
- `metadata` (JSONB)

**Relationships:**

- Has Many `Subscriptions`


### **20. Subscriptions**

**Purpose:** Manages different subscriptions and their associated features and pricing.

**Attributes:**

- `subscription_id` (Primary Key, UUID)
- `organization_id` (Foreign Key, links to `Organization`)
- `plan_id` (Foreign Key, links to `Plan`)
- `status` (Enum: `Active`, `Cancelled`, `Paused`)
- `current_period_start` (Date)
- `current_period_end` (Date)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `metadata` (JSONB)
- `plan_details` (JSONB)

**Relationships:**

- Belongs To `Organization`
- Associated with `Plan`

### **21. CreditTransactions**

**Purpose:** Keep a record of all credit transactions.

**Attributes:**

- `transaction_id` (Primary Key, UUID)
- `organization_id` (Foreign Key, links to `Organization`)
- `amount` (Integer)
- `new_credit_balance` (Integer)
- `old_credit_balance` (Integer)
- `description` (Text)
- `type` (String)
- `metadata` (JSONB)
- `created_at` (Timestamp)

**Relationships:**

- Belongs To `Organization`

### **22. BillingTransactions**

**Purpose:** Keep a record of all billing transactions.

**Attributes:**

- `transaction_id` (Primary Key, UUID)
- `organization_id` (Foreign Key, links to `Organization`)
- `subscription_id` (Foreign Key, links to `Subscription`)
- `transaction_type` (String)
- `date` (Date)
- `amount` (Decimal)
- `credits_purchased` (Integer)
- `currency` (String)
- `status` (Enum: `Pending`, `Processing`, `Completed`, `Failed`, `Refunded`, `Cancelled`)
- `payment_provider` (String)
- `payment_method_last4` (String)
- `provider_transaction_id` (String)
- `provider_fee` (Decimal)
- `authorization_code` (String)
- `metadata` (JSONB)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `settled_at` (Timestamp)
- `billing_period_start` (Date)
- `billing_period_end` (Date)

**Relationships:**

- Belongs To `Organization`
- Associated with `Subscription`