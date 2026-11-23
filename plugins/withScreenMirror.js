const { createRunOncePlugin, withAndroidManifest } = require('expo/config-plugins');

const SERVICE_NAME = 'expo.modules.screenmirror.ScreenMirrorService';

const PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION',
  'android.permission.POST_NOTIFICATIONS',
];

function addPermissions(manifest) {
  manifest['uses-permission'] = manifest['uses-permission'] || [];

  for (const name of PERMISSIONS) {
    const alreadyPresent = manifest['uses-permission'].some(
      (entry) => entry.$ && entry.$['android:name'] === name
    );
    if (!alreadyPresent) {
      manifest['uses-permission'].push({ $: { 'android:name': name } });
    }
  }
}

function addService(manifest) {
  manifest.application = manifest.application || [];
  if (!manifest.application[0]) {
    manifest.application[0] = { $: {} };
  }

  const application = manifest.application[0];
  application.service = application.service || [];

  const alreadyPresent = application.service.some(
    (service) => service.$ && service.$['android:name'] === SERVICE_NAME
  );
  if (!alreadyPresent) {
    application.service.push({
      $: {
        'android:name': SERVICE_NAME,
        'android:exported': 'false',
        'android:foregroundServiceType': 'mediaProjection',
      },
    });
  }
}

function withScreenMirror(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    addPermissions(manifestConfig.modResults.manifest);
    addService(manifestConfig.modResults.manifest);
    return manifestConfig;
  });
}

module.exports = createRunOncePlugin(withScreenMirror, 'bubi-screen-mirror', '1.0.0');
