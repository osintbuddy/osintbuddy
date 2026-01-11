[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Total Downloads](https://static.pepy.tech/badge/osintbuddy)](https://pepy.tech/project/osintbuddy)
[![Downloads](https://static.pepy.tech/badge/osintbuddy/week)](https://pepy.tech/project/osintbuddy)

## Introducing OSINTBuddy: Reloaded

<p>
  <a href="https://github.com/osintbuddy/osintbuddy">
    <img src="./watermark.svg" height="130px" alt="Logo">
  </a>

> _I have no data yet. It is a capital mistake to theorize before one has data. Insensibly
> one begins to twist facts to suit theories, instead of theories to suit facts._

---

# OSINTBuddy Releases & Community Registry

This repository hosts public OSINTBuddy releases plus the community plugin and theme registries.
It does not contain the OSINTBuddy application source code.

## Submissions

1. Fork this repo and open a PR.
2. Append your entry to the end of the relevant JSON list.
3. Keep entries in the order submitted; do not reorder existing entries.

### Community Plugins format

Required fields:

- `id`: unique, lowercase slug (letters, numbers, dashes)
- `name`: display name
- `author`: author or org name
- `description`: short one-line description
- `repo`: GitHub `owner/repo`

Optional fields:

- `license`
- `tags`
- `min_app_version`
- `homepage`

### Community Themes format

Required fields:

- `name`
- `author`
- `repo`
- `screenshot`: path to screenshot in the theme repo
- `modes`: `['dark']`, `['light']`, or `['dark','light']`

Optional fields:

- `version`
- `tags`
- `publish`: boolean for themes compatible with OSINTBuddy Publish (if/when supported)

## Policies

All submissions must conform with our [developer policies](./DEVELOPER_POLICIES.md). To summarize:

- You must have the rights to distribute the plugin or theme.
- No malicious, deceptive, or privacy-invasive behavior.
- Clearly disclose network calls and data collection.
- For OSINTBuddy plugin issues, use: https://github.com/osintbuddy/osintbuddy/issues

[contributors-shield]: https://img.shields.io/github/contributors/jerlendds/osintbuddy.svg?style=for-the-badge
[contributors-url]: https://github.com/jerlendds/osintbuddy/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/jerlendds/osintbuddy.svg?style=for-the-badge
[forks-url]: https://github.com/jerlendds/osintbuddy/network/members
[stars-shield]: https://img.shields.io/github/stars/jerlendds/osintbuddy.svg?style=for-the-badge
[stars-url]: https://github.com/jerlendds/osintbuddy/stargazers
[issues-shield]: https://img.shields.io/github/issues/jerlendds/osintbuddy.svg?style=for-the-badge
[issues-url]: https://github.com/jerlendds/osintbuddy/issues
