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
    console.log('Firebase Remote Config loaded successfully, ETag:', template.etag);
    return template;
  } catch (error) {
    console.error('Error fetching Remote Config template:', error);
    throw error;
  }
}

export async function getVariantValuesFromRemoteConfig() {
  try {
    const template = await fetchRemoteConfigTemplate();
    
    // Parameters are in the "test" parameter group, not root parameters
    const testGroupParams = template.parameterGroups?.test?.parameters;
    
    if (!testGroupParams) {
      console.log('No test parameter group found in Remote Config');
      return null;
    }
    
    // Extract minerals_needed and moves_available from the android condition
    const mineralsNeeded = testGroupParams.minerals_needed;
    const movesAvailable = testGroupParams.moves_available;
    
    if (!mineralsNeeded || !movesAvailable) {
      console.log('Remote Config parameters missing:', {
        minerals_needed: !!mineralsNeeded,
        moves_available: !!movesAvailable
      });
      return null;
    }
    
    // Get the android condition values
    const androidCondition = mineralsNeeded.conditionalValues?.android;
    const androidConditionMoves = movesAvailable.conditionalValues?.android;
    
    if (!androidCondition || !androidConditionMoves) {
      console.log('Android condition missing in Remote Config parameters');
      return null;
    }
    
    const mineralsValue = JSON.parse(androidCondition.value || '{}');
    const movesValue = JSON.parse(androidConditionMoves.value || '{}');
    
    return {
      minerals_needed: mineralsValue,
      moves_available: movesValue
    };
  } catch (error) {
    console.error('Error parsing remote config values:', error);
    return null;
  }
}

export async function updateRemoteConfigParameters(
  mineralsNeeded: { android: number; macos: number; ios: number; web: number },
  movesAvailable: { android: number; macos: number; ios: number; web: number }
) {
  try {
    // 1. Get current template
    const template = await remoteConfig.getTemplate();
    
    // Ensure the test parameter group exists
    if (!template.parameterGroups) {
      template.parameterGroups = {};
    }
    if (!template.parameterGroups.test) {
      template.parameterGroups.test = { parameters: {} };
    }
    
    // 2. Update minerals_needed parameter
    template.parameterGroups.test.parameters.minerals_needed = {
      conditionalValues: {
        android: {
          value: JSON.stringify(mineralsNeeded)
        }
      },
      defaultValue: {
        value: JSON.stringify(mineralsNeeded)
      }
    };
    
    // 3. Update moves_available parameter
    template.parameterGroups.test.parameters.moves_available = {
      conditionalValues: {
        android: {
          value: JSON.stringify(movesAvailable)
        }
      },
      defaultValue: {
        value: JSON.stringify(movesAvailable)
      }
    };
    
    // 4. Publish updated template
    const updated = await remoteConfig.publishTemplate(template);
    console.log('Firebase Remote Config updated successfully, new ETag:', updated.etag);
    
    return {
      success: true,
      etag: updated.etag,
      minerals_needed: mineralsNeeded,
      moves_available: movesAvailable
    };
  } catch (error) {
    console.error('Error updating Remote Config parameters:', error);
    throw error;
  }
}

export { remoteConfig };