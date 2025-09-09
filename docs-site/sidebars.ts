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
      label: 'API',
      items: ['api/intro'],
    },
        {
          type: 'category',
          label: 'React SDK',
          items: [
        'react-sdk/introduction',
        'react-sdk/installation',
        'react-sdk/core-concepts',
        'react-sdk/provider',
        'react-sdk/user',
        'react-sdk/experiences',
        'react-sdk/events',
        'react-sdk/registry',
        'react-sdk/advanced',
        'react-sdk/testing',
        'react-sdk/api',
        'react-sdk/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Unity SDK',
      items: ['unity-sdk/intro'],
    },
  ],
};

export default sidebars;
