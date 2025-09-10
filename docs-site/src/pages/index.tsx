import React from 'react';
import {Redirect} from '@docusaurus/router';

export default function Home() {
  // Redirect root to the API Documentation intro page
  return <Redirect to="/api/events_api" />;
}
