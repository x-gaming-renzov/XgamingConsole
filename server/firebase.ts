import admin from 'firebase-admin';
import serviceAccountKey from '../smartobjdemo.json';

// Initialize Firebase Admin SDK using the JSON file
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey as admin.ServiceAccount),
  });
}

const remoteConfig = admin.remoteConfig();

export async function fetchRemoteConfigTemplate() {
  try {
    const template = await remoteConfig.getTemplate();
    console.log('Firebase Remote Config ETag:', template.etag);
    console.log('Firebase Remote Config Full Template:', JSON.stringify(template, null, 2));
    console.log('Firebase Remote Config Parameters Keys:', Object.keys(template.parameters || {}));
    console.log('Firebase Remote Config Parameters:', JSON.stringify(template.parameters, null, 2));
    
    // Check if there are any conditions
    if (template.conditions) {
      console.log('Firebase Remote Config Conditions:', JSON.stringify(template.conditions, null, 2));
    }
    
    return template;
  } catch (error) {
    console.error('Error fetching Remote Config template:', error);
    throw error;
  }
}

export async function getVariantValuesFromRemoteConfig() {
  try {
    const template = await fetchRemoteConfigTemplate();
    const parameters = template.parameters;
    
    // Extract minerals_needed and moves_available from the android condition
    const mineralsNeeded = parameters?.minerals_needed;
    const movesAvailable = parameters?.moves_available;
    
    if (!mineralsNeeded || !movesAvailable) {
      console.log('Remote config parameters not found, using fallback values');
      return null;
    }
    
    // Get the android condition values
    const androidCondition = mineralsNeeded.conditionalValues?.android;
    const androidConditionMoves = movesAvailable.conditionalValues?.android;
    
    if (!androidCondition || !androidConditionMoves) {
      console.log('Android condition not found in remote config');
      return null;
    }
    
    const mineralsValue = JSON.parse(androidCondition.value || '{}');
    const movesValue = JSON.parse(androidConditionMoves.value || '{}');
    
    console.log('Remote Config minerals_needed android condition:', mineralsValue);
    console.log('Remote Config moves_available android condition:', movesValue);
    
    return {
      minerals_needed: mineralsValue,
      moves_available: movesValue
    };
  } catch (error) {
    console.error('Error parsing remote config values:', error);
    return null;
  }
}

export { remoteConfig };