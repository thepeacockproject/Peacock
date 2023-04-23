# The Peacock Project

[![Discord](https://img.shields.io/discord/826809653181808651?label=Discord&logo=discord&logoColor=white&style=for-the-badge)](https://discord.gg/peacock)

The Peacock Project is a HITMAN World of Assassination Trilogy server
replacement.
The primary purpose is preservation of the game, but it also adds new features
and
content to the game, and allows for other enhancements to be made while in
online mode.

## Installation

Install [Node.js](https://nodejs.org/en/). Use the Latest version, or the
version
specifically mentioned here: **Version 18**

Clone the repository where-ever you wish.

Open Windows terminal **AS ADMINISTRATOR**.

Install Yarn, by typing:

> corepack enable

Then move to the folder where you cloned the repo to by using:

> cd Folder/Path/Here

then install the dependencies by using:

> yarn install

## Usage

The project is bundled with a server running configuration.
Run that when editing the project with the IDE of choice, and it should open.

We highly suggest you use [WebStorm](https://www.jetbrains.com/webstorm/) for
development,
but it is a paid product, so you may want to choose something
like [Visual Studio Code](https://code.visualstudio.com/).
WebStorm will provide a better experience for development, but VSCode will work
just fine.

## Contributing

To contribute, you can use Pull Requests from your own fork. You can fix bugs
reported in issues or add new features you think would be useful, new features
not listed in issues would have to be discussed before merging.

### Localisation

#### Automated

The Peacock repository has an automated workflow to rebuild locale packages.
All you need to do to update localisation files is:

1. Edit `locale.json`.
    - If you're adding new strings, make sure to add the English versions to
      all languages.
    - If you're translating existing strings, you only need to translate the
      ones that are in the language(s) you are translating.
2. Then push `locale.json`.
3. Then, make a Pull Request. When it is reviewed and merged, locale packages
   will automatically be rebuilt.

#### Manual

If you need to manually rebuild locale packages for whatever reason (testing
or otherwise), follow steps 1 and 2 above, then do the following:

1. Make sure `rpkg_cli.exe`, `HMLanguageTools.exe`, and `ResourceLib_*.dll` are
   in the `resources` folder.
2. Then, from the root project folder, run `yarn rebuild-locale`.
3. These generated RPKGs should **not** be pushed or merged into Peacock as
   the automated workflow will take care of this for you.

Thank you to people who have contributed!

## License

Peacock is under the AGPL-3.0 license, see the license file for more info.

## Credits

Peacock started off as a fork
of [LocalGhost](https://gitlab.com/grappigegovert/LocalGhost)
by grappigegovert, and has since been rewritten in TypeScript, and a whole host
of new features have been added. The codebase has been relicensed to AGPL-3.0
with explicit permission from grappigegovert.

The game is owned by [IO Interactive](https://ioi.dk), and is not affiliated
with this project in any way.
