import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: process.env.AUTH_URI,
  token_uri: process.env.TOKEN_URI,
  auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: process.env.PROJECT_ID,
  });
}

const remoteConfig = admin.remoteConfig();

export async function fetchRemoteConfigTemplate() {
  try {
    const template = await remoteConfig.getTemplate();
    console.log('Firebase Remote Config ETag:', template.etag);
    console.log('Firebase Remote Config Parameters:', JSON.stringify(template.parameters, null, 2));
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