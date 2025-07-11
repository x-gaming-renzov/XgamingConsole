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
    console.log('=== FIREBASE REMOTE CONFIG DEBUG START ===');
    const template = await remoteConfig.getTemplate();
    
    console.log('Remote Config ETag:', template.etag);
    console.log('Template version:', template.version);
    console.log('Template type:', typeof template);
    console.log('Template keys:', Object.keys(template));
    
    // Deep inspect parameters
    const params = template.parameters;
    console.log('Parameters exists:', !!params);
    console.log('Parameters type:', typeof params);
    console.log('Parameters keys:', Object.keys(params || {}));
    console.log('Parameters object:', params);
    
    // Check parameter groups too
    if (template.parameterGroups) {
      console.log('Parameter groups:', Object.keys(template.parameterGroups));
      console.log('Parameter groups details:', JSON.stringify(template.parameterGroups, null, 2));
    }
    
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        console.log(`Parameter "${key}":`, JSON.stringify(value, null, 2));
        
        // Check for conditional values
        if (value && typeof value === 'object' && value.conditionalValues) {
          console.log(`  Conditional values for "${key}":`, Object.keys(value.conditionalValues));
          for (const [condKey, condValue] of Object.entries(value.conditionalValues)) {
            console.log(`    Condition "${condKey}":`, JSON.stringify(condValue, null, 2));
          }
        }
        
        // Check for default value
        if (value && typeof value === 'object' && value.defaultValue) {
          console.log(`  Default value for "${key}":`, value.defaultValue);
        }
      }
    }
    
    // Check conditions
    if (template.conditions) {
      console.log('Available conditions:', Object.keys(template.conditions));
      console.log('Conditions details:', JSON.stringify(template.conditions, null, 2));
    } else {
      console.log('No conditions found in template');
    }
    
    console.log('=== FIREBASE REMOTE CONFIG DEBUG END ===');
    return template;
  } catch (error) {
    console.error('Error fetching Remote Config template:', error);
    throw error;
  }
}

export async function getVariantValuesFromRemoteConfig() {
  try {
    console.log('=== PARSING REMOTE CONFIG VALUES ===');
    const template = await fetchRemoteConfigTemplate();
    const parameters = template.parameters;
    
    console.log('Parameters available:', !!parameters);
    console.log('Looking for minerals_needed and moves_available...');
    
    // Extract minerals_needed and moves_available from the android condition
    const mineralsNeeded = parameters?.minerals_needed;
    const movesAvailable = parameters?.moves_available;
    
    console.log('minerals_needed found:', !!mineralsNeeded);
    console.log('moves_available found:', !!movesAvailable);
    
    if (!mineralsNeeded && !movesAvailable) {
      console.log('Neither parameter found. Available parameters:', Object.keys(parameters || {}));
      return null;
    }
    
    if (!mineralsNeeded || !movesAvailable) {
      console.log('One parameter missing:');
      console.log('  minerals_needed:', !!mineralsNeeded);
      console.log('  moves_available:', !!movesAvailable);
      return null;
    }
    
    console.log('Both parameters found, checking android condition...');
    
    // Get the android condition values
    const androidCondition = mineralsNeeded.conditionalValues?.android;
    const androidConditionMoves = movesAvailable.conditionalValues?.android;
    
    console.log('minerals_needed has android condition:', !!androidCondition);
    console.log('moves_available has android condition:', !!androidConditionMoves);
    
    if (!androidCondition || !androidConditionMoves) {
      console.log('Android condition missing for one or both parameters');
      if (mineralsNeeded.conditionalValues) {
        console.log('minerals_needed conditions:', Object.keys(mineralsNeeded.conditionalValues));
      }
      if (movesAvailable.conditionalValues) {
        console.log('moves_available conditions:', Object.keys(movesAvailable.conditionalValues));
      }
      return null;
    }
    
    console.log('Android condition values:');
    console.log('  minerals_needed android value:', androidCondition.value);
    console.log('  moves_available android value:', androidConditionMoves.value);
    
    const mineralsValue = JSON.parse(androidCondition.value || '{}');
    const movesValue = JSON.parse(androidConditionMoves.value || '{}');
    
    console.log('Parsed values:');
    console.log('  minerals_needed:', mineralsValue);
    console.log('  moves_available:', movesValue);
    
    const result = {
      minerals_needed: mineralsValue,
      moves_available: movesValue
    };
    
    console.log('Final result:', result);
    console.log('=== PARSING COMPLETE ===');
    
    return result;
  } catch (error) {
    console.error('Error parsing remote config values:', error);
    console.error('Error stack:', error.stack);
    return null;
  }
}

export { remoteConfig };