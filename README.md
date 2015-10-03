[![NPM version](http://img.shields.io/npm/v/vapor-storehouse.svg?style=flat)](https://www.npmjs.org/package/vapor-storehouse)
[![Dependency Status](https://david-dm.org/scholtzm/vapor-storehouse.svg)](https://david-dm.org/scholtzm/vapor-storehouse)

# Vapor Store House Plugin

[Vapor](https://github.com/scholtzm/vapor) plugin to create storage account using trade offers.

### Features

- Automatically accepts all trade offers from admin(s).
- Automatically declines any other trade offer.
- Supports Family View if you have it enabled.

### Installation

```sh
npm install vapor-storehouse
```

### Usage

```js
var storehouse = require('vapor-storehouse');

// Instantiate Vapor etc.

vapor.use(storehouse);
// or
vapor.use(storehouse, {familyViewPIN: '1234'});
```

### Configuration

#### `familyViewPIN` (optional)

Family view PIN.

### Events

#### `message:*`

* `message` - A message string.

Standard [message events](https://github.com/scholtzm/vapor/blob/master/docs/EVENTS.md#message) to be used with logger.

### License

MIT. See `LICENSE`.
