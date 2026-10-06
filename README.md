
# 📮 react-native-email
[![package version](https://img.shields.io/npm/v/react-native-email.svg?style=flat-square)](https://npmjs.org/package/react-native-email)
[![package downloads](https://img.shields.io/npm/dm/react-native-email.svg?style=flat-square)](https://npmjs.org/package/react-native-email)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/react-native-email.svg?style=flat-square)](https://npmjs.org/package/react-native-email)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

Open a prefilled, plain-text email in an installed mail app using React Native's Linking API.

## Table of Contents

- [📮 react-native-email](#-react-native-email)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
  - [Usage](#usage)
    - [Line breaks in the body](#line-breaks-in-the-body)
    - [Running on iOS simulator](#running-on-ios-simulator)
    - [Running on Android SDK 30+](#running-on-android-sdk-30)
  - [API](#api)
    - [Return value and errors](#return-value-and-errors)
    - [Attachments and formatting](#attachments-and-formatting)
  - [Contributing](#contributing)
    - [Development checks](#development-checks)
  - [License](#license)

## Install

Install the package locally within you project folder with your package manager:

With `npm`:
```sh
npm install --save-exact react-native-email@2.1.0
```

With `yarn`:
```sh
yarn add --exact react-native-email@2.1.0
```

Versions `2.1.1` and `2.1.2` are affected by [MAL-2025-190996](https://osv.dev/vulnerability/MAL-2025-190996). The commands above pin `2.1.0` to avoid those releases.

## Usage

```jsx
import React from 'react'
import { StyleSheet, Button, View } from 'react-native'
import email from 'react-native-email'

export default class App extends React.Component {
    render() {
        return (
            <View style={styles.container}>
                <Button title="Send Mail" onPress={this.handleEmail} />
            </View>
        )
    }

    handleEmail = () => {
        const to = ['first@example.com', 'second@example.com'] // string or array of email addresses
        email(to, {
            // Optional additional arguments
            cc: ['copy@example.com', 'another-copy@example.com'], // string or array of email addresses
            bcc: 'hidden@example.com', // string or array of email addresses
            subject: 'Show how to use',
            body: 'Some body right here',
            checkCanOpen: true // Check for a mail app before opening (default: true)
        }).catch(console.error)
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center'
    }
})
```

This results to: 

<div align="center">
  <img width="70%" src="result.jpeg" alt=""/>
</div>

### Line breaks in the body

Pass a plain-text `body` with `\r\n` (CRLF) between lines. Use `\r\n\r\n` for a blank line:

```js
email('recipient@example.com', {
    subject: 'Multiple lines',
    body: 'First line\r\nSecond line\r\n\r\nLast paragraph'
}).catch(console.error)
```

These JavaScript escape sequences create actual line breaks in the string. The library preserves the supplied line endings and URL-encodes the body; it does not convert `\n` to `\r\n`. CRLF produces `%0D%0A`, the line-break encoding required by [RFC 6068](https://www.rfc-editor.org/rfc/rfc6068#section-5).

Pass the original text, not a pre-encoded value such as `%0D%0A` or `encodeURIComponent(body)`, because the library would encode it again. Literal backslash characters (for example, `'First\\nSecond'`) and HTML `<br>` tags are plain text, not line-break instructions.

The installed mail app renders the body. Test with the mail apps and OS versions your app supports; this library cannot correct a mail app's formatting behavior.

### Running on iOS simulator

Opening a `mailto:` URL requires an installed mail app that can handle it. An iOS simulator may not have one, so validate mail composition on a device with a mail app available.

### Running on Android SDK 30+

When your app targets Android 11 (API level 30) or higher, package visibility filtering can prevent `Linking.canOpenURL` from finding an installed mail app. With `checkCanOpen` enabled (the default), this can cause a `Provided URL can not be handled` error.

Add the following `<queries>` element as a direct child of `<manifest>` in `android/app/src/main/AndroidManifest.xml`, outside `<application>`. If your manifest already has `<queries>`, add the `<intent>` to it:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="mailto" />
        </intent>
    </queries>
    <!-- Keep your existing application and other manifest entries here. -->
</manifest>
```

React Native's `Linking.canOpenURL` and `Linking.openURL` use `ACTION_VIEW` on Android, so the query must match that action and the `mailto` scheme. A `DIAL` query is for phone calls and does not describe this library's email intent. See the [React Native Linking documentation](https://reactnative.dev/docs/linking#canopenurl), [React Native Android implementation](https://github.com/facebook/react-native/blob/v0.71.6/ReactAndroid/src/main/java/com/facebook/react/modules/intent/IntentModule.java), and [Android package visibility guidance](https://developer.android.com/training/package-visibility/use-cases).

A mail app that handles `mailto:` must still be installed. Rebuild the Android app after changing its manifest. If the check still fails, confirm that a mail app is available on your emulator or device.

Setting `checkCanOpen: false` skips the visibility check and attempts `Linking.openURL` directly. Android does not require package visibility to start another app's activity, but opening can still reject if there is no handler. Handle the returned promise's rejection, as in the usage example.

## API

The default export is `email(to, options?)`, returning `Promise<any>`. The API below describes the `2.1.0` release pinned in the [install instructions](#install).

| Argument | Type | Default | Description |
| --- | --- | --- | --- |
| `to` | `string` or `string[]` | Required by the TypeScript declaration | Recipient address or array of addresses |
| `options` | `SendEmailOptions` | `{}` | Optional object containing the fields below |
| `options.cc` | `string` or `string[]` | `undefined` (omitted) | Copy recipient address or array of addresses |
| `options.bcc` | `string` or `string[]` | `undefined` (omitted) | Blind-copy recipient address or array of addresses |
| `options.subject` | `string` | `undefined` (omitted) | Email subject |
| `options.body` | `string` | `undefined` (omitted) | Plain-text email body; see [line breaks](#line-breaks-in-the-body) |
| `options.checkCanOpen` | `boolean` | `true` | Check `Linking.canOpenURL` before calling `Linking.openURL`; `false` skips only the check |

Recipient arrays are joined with commas. Pass original, unencoded addresses and text; the library URL-encodes them when building the `mailto:` URL. It does not validate email addresses.

Supply at least one recipient when using the mail fields. In `2.1.0`, omitting `to` at runtime or passing an empty string opens a bare `mailto:` URL and ignores `cc`, `bcc`, `subject`, and `body`.

### Return value and errors

The returned promise follows `Linking.openURL`. A resolved promise only indicates that the URL was opened; it does not confirm that the user sent the email or that it was delivered. The user reviews and sends the message in their mail app.

- With `checkCanOpen: true`, a `false` result from `Linking.canOpenURL` rejects with `Error('Provided URL can not be handled')` without attempting to open the URL.
- Errors from `Linking.canOpenURL` or `Linking.openURL` are passed through as promise rejections. Setting `checkCanOpen: false` does not prevent opening failures.

Handle rejections with `.catch(...)` as in the [usage example](#usage), or use `try`/`catch` around `await email(...)`. See the [Android setup](#running-on-android-sdk-30) and [iOS simulator guidance](#running-on-ios-simulator) if a mail app cannot be found.

### Attachments and formatting

Attachments are not supported. There is no attachment option for images or other files. Putting a file path, image URL, or HTML in `body` only supplies text to the mail app; it does not attach a file or create an HTML email.

This package builds a plain-text `mailto:` URL and opens it through `Linking`. Sending files requires a separate native mail composer or platform sharing integration with attachment support. The available mail apps determine how the supplied text is displayed.

## Contributing

Got an idea for a new feature? Found a bug? Contributions are welcome! Please [open up an issue](https://github.com/tiaanduplessis/react-native-email/issues) or [make a pull request](https://makeapullrequest.com/).

### Development checks

Use Node.js 18 or newer and pnpm 7.33.7 to run the regression suite:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm lint
pnpm test
```

The tests exercise the checked-in source with a mocked React Native `Linking` API, parse and run the README usage example, and check the Android manifest query. They do not validate Android package visibility or mail composition on a device. For that, build an app targeting API 30 or higher with the manifest query above, then use the default `checkCanOpen: true` on an emulator or device with a mail app installed. Confirm that the composer opens with the expected recipients, subject, and body; also check rejection handling when no mail app is available.

## License

[MIT © Tiaan du Plessis](./LICENSE)
