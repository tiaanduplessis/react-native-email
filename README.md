
# 📮 react-native-email
[![package version](https://img.shields.io/npm/v/react-native-email.svg?style=flat-square)](https://npmjs.org/package/react-native-email)
[![package downloads](https://img.shields.io/npm/dm/react-native-email.svg?style=flat-square)](https://npmjs.org/package/react-native-email)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/react-native-email.svg?style=flat-square)](https://npmjs.org/package/react-native-email)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

Send a email using the Linking API

## Table of Contents

- [📮 react-native-email](#-react-native-email)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
  - [Usage](#usage)
    - [Running on iOS simulator](#running-on-ios-simulator)
  - [API](#api)
  - [Contributing](#contributing)
  - [License](#license)

## Install

Install the package locally within you project folder with your package manager:

With `npm`:
```sh
npm install react-native-email
```

With `yarn`:
```sh
yarn add react-native-email
```

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
        const to = ['tiaan@email.com', 'foo@bar.com'] // string or array of email addresses
        email(to, {
            // Optional additional arguments
            cc: ['bazzy@moo.com', 'doooo@daaa.com'], // string or array of email addresses
            bcc: 'mee@mee.com', // string or array of email addresses
            subject: 'Show how to use',
            body: 'Some body right here'
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

### Running on iOS simulator

When running on the iOS simulator, you will get a `the URL is invalid` error. This will work on an actual device. **The iOS simulator does not have access to the dialer app.**.


## API

For all configuration options, please see the [API docs](https://paka.dev/npm/react-native-email).

## Contributing

Got an idea for a new feature? Found a bug? Contributions are welcome! Please [open up an issue](https://github.com/tiaanduplessis/react-native-email/issues) or [make a pull request](https://makeapullrequest.com/).

## License

[MIT © Tiaan du Plessis](./LICENSE)
