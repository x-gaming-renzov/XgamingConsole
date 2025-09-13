import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        // { type: 'doc', id: 'getting-started/intro', label: 'Getting Started' },
        { type: 'doc', id: 'getting-started/getting-started-credentials', label: 'Getting SDK Credentials' },
      ],
    },
    {
      type: 'category',
      label: 'API',
      items: [
        // { type: 'doc', id: 'api/intro', label: 'API Documentation' },
        { type: 'doc', id: 'api/events_api', label: 'Events API' },
        { type: 'doc', id: 'api/sync_nova_objects_api', label: 'Sync Nova Objects API' },
        { type: 'doc', id: 'api/user_experience_api', label: 'User Experience API' },
        { type: 'doc', id: 'api/users_api', label: 'Users API' },
      ],
    },
        {
          type: 'category',
          label: 'React SDK',
          items: [
  { type: 'doc', id: 'react-sdk/intro', label: 'Introduction' },
  { type: 'doc', id: 'react-sdk/installation', label: 'Installation' },
  { type: 'doc', id: 'react-sdk/core-concepts', label: 'Core Concepts' },
  { type: 'doc', id: 'react-sdk/provider', label: 'Provider Setup' },
  { type: 'doc', id: 'react-sdk/user', label: 'User Lifecycle' },
  { type: 'doc', id: 'react-sdk/experiences', label: 'Experiences' },
  { type: 'doc', id: 'react-sdk/events', label: 'Events' },
  { type: 'doc', id: 'react-sdk/registry', label: 'Registry Design' },
  { type: 'doc', id: 'react-sdk/advanced', label: 'Advanced Patterns' },
  { type: 'doc', id: 'react-sdk/testing', label: 'Testing' },
  { type: 'doc', id: 'react-sdk/api', label: 'API Reference' },
  { type: 'doc', id: 'react-sdk/troubleshooting', label: 'Troubleshooting' },
      ],
    },
    // {
    //   type: 'category',
    //   label: 'Unity SDK',
    //   items: ['unity-sdk/intro'],
    // },
  ],
};

export default sidebars;
