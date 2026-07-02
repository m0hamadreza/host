/**
 * @format
 */
import { withAsyncStartup } from '@module-federation/metro/bootstrap';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';

const WrappedApp = withAsyncStartup(
  () => require('./App'),
//   () => require('./Fallback') // Optional fallback component
);

// withAsyncStartup already returns a component provider (() => Component),
// which is exactly what registerComponent expects — do not wrap it again.
AppRegistry.registerComponent(appName, WrappedApp);
