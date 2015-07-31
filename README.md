[![Dependency Status](https://david-dm.org/scholtzm/vapor-storehouse.svg)](https://david-dm.org/scholtzm/vapor-storehouse)

# Vapor Store House Plugin

[Vapor](https://github.com/scholtzm/vapor) plugin to run storage bot using trade offers.

### Features

- Automatically accepts all trade offers from admin(s).
- Automatically declines any other trade offer.
- Supports Family View if you have it enabled.

### Installation

1. Go to your Vapor folder.
2. Run `npm install git+https://github.com/scholtzm/vapor-storehouse.git`.
3. Open your config file and update `plugins` to include settings for this plugin. It should look something like this...

```json
"plugins": {
  "vapor-storehouse": {}
}
```

... or like this ...

```json
"plugins": {
  "vapor-storehouse": {
    "familyViewPIN": "1234"
  }
}
```

### Settings

#### `familyViewPIN` (optional)

Family view PIN.

### License

MIT. See `LICENSE`.
