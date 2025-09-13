---
id: getting-started-credentials
title: Getting SDK Credentials
---

Learn how to obtain your Nova SDK credentials to authenticate API and SDK calls.

## Steps to Retrieve Your SDK Credentials

1. Log into the Nova dashboard.

	![Nova Dashboard](/images/dashboard.png)

2. Click the **Settings** button in the sidebar (bottom left).

	![Settings Menu](/images/settings_menu.png)

3. Select **Project Settings**.

4. In the settings panel, head over to the **SDK Integration** tab.

	![SDK Integration Tab](/images/settings_tab.png)

5. Copy the **SDK API Key**.

	![API Key](/images/api_key.png)

:::tip
You must be a **Developer** or **Admin** in the project to access Project Settings. If you don't see the Settings button, verify you've selected the correct app on the sidebar.
:::

:::warning
The SDK API Key is shared by the entire project. Do **not** expose it anywhere except within your backend or SDK configuration.
:::

## Base URL

Your Nova dashboard will show your organization’s Base URL (`NOVA_BASE_URL`). Use this for all API calls.
